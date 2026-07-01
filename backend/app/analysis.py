import re
import json
import urllib.request
from datetime import datetime, timedelta
from typing import List, Optional
import praw
import spacy
from spacy.cli import download as spacy_download
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from textblob import TextBlob
from transformers import pipeline

from app.config import settings

# Load spaCy model with auto-download fallback
try:
    spacy_nlp = spacy.load("en_core_web_sm")
except OSError:
    spacy_download("en_core_web_sm")
    spacy_nlp = spacy.load("en_core_web_sm")

# Initialize models
vader = SentimentIntensityAnalyzer()

# DistilBERT classifier
bert = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

# Gemini client — only initialized if API key is set
gemini_client = None
if settings.GEMINI_API_KEY:
    try:
        from google import genai as _genai
        gemini_client = _genai.Client(api_key=settings.GEMINI_API_KEY)
    except Exception:
        gemini_client = None


def _call_ollama(prompt: str) -> str:
    """Calls Ollama's local HTTP API to generate a completion."""
    payload = json.dumps({
        "model": settings.OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False
    }).encode("utf-8")
    url = f"{settings.OLLAMA_HOST.rstrip('/')}/api/generate"
    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    return result.get("response", "").strip()


def _call_gemini(prompt: str) -> str:
    """Calls Gemini API to generate a completion."""
    if gemini_client is None:
        raise RuntimeError("Gemini API key is not configured. Set GEMINI_API_KEY in backend/.env")
    resp = gemini_client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt
    )
    return resp.text.strip()


def _call_llm(prompt: str, provider: str) -> str:
    """Routes LLM calls to either Gemini or Ollama based on provider string."""
    if provider == "ollama":
        return _call_ollama(prompt)
    else:
        return _call_gemini(prompt)


def fetch_reddit_posts(query: str, limit: int, subreddit_name: Optional[str], time_window: str) -> List[dict]:
    """
    Fetches posts from Reddit based on query, limit, subreddit, and time window constraints.
    """
    cutoff = None
    # Calculate cutoff timezone-aware or UTC-based depending on PRAW's utc timestamp
    if time_window == "Last 24h":
        cutoff = datetime.utcnow() - timedelta(days=1)
    elif time_window == "Last 7d":
        cutoff = datetime.utcnow() - timedelta(days=7)
    
    # Initialize PRAW Reddit client using env configuration
    reddit = praw.Reddit(
        client_id=settings.REDDIT_CLIENT_ID,
        client_secret=settings.REDDIT_CLIENT_SECRET,
        user_agent=settings.REDDIT_USER_AGENT
    )
    
    subreddit_str = subreddit_name.strip() if subreddit_name else ""
    area = reddit.subreddit(subreddit_str) if subreddit_str else reddit.subreddit("all")
    
    records = []
    for post in area.search(query, limit=limit, sort="new"):
        created = datetime.utcfromtimestamp(post.created_utc)
        if cutoff and created < cutoff:
            continue
        if not post.stickied:
            records.append({
                "reddit_id": post.id,
                "title": post.title,
                "selftext": post.selftext or "",
                "text": f"{post.title} {post.selftext or ''}",
                "created_utc": created
            })
    return records


def preprocess_text(text: str) -> str:
    """
    Cleans text by removing URLs and preserving letters, numbers, spaces,
    and financially/contextually meaningful characters like $, %, +, -.
    """
    # Remove http/https links
    txt = re.sub(r"http\S+", "", text)
    # Keep characters: alphabetic, numeric, space, and $, %, +, -
    txt = re.sub(r"[^a-zA-Z0-9\s$%+-]", "", txt)
    return " ".join(txt.lower().split())


def analyze_sentiment(clean_text: str, w_vader: float, w_blob: float, w_bert: float) -> dict:
    """
    Performs sentiment analysis using VADER, TextBlob, and DistilBERT.
    Integrates DistilBERT's confidence score directly in the ensemble.
    """
    # Auto-normalize weights
    total_w = w_vader + w_blob + w_bert or 1.0
    w_v, w_b, w_t = w_vader / total_w, w_blob / total_w, w_bert / total_w
    
    # 1. VADER score
    v_score = vader.polarity_scores(clean_text)["compound"]
    
    # 2. TextBlob score
    b_score = TextBlob(clean_text).sentiment.polarity
    
    # 3. DistilBERT score
    t_score = 0.0
    t_confidence = 0.0
    if clean_text:
        try:
            # Truncating clean_text to 512 characters is safe for DistilBERT context length limit
            out = bert(clean_text[:512])[0]
            t_confidence = out["score"]
            t_score = t_confidence if out["label"] == "POSITIVE" else -t_confidence
        except Exception:
            t_score = 0.0
            t_confidence = 0.0
            
    # Calculate ensemble score
    ensemble_score = round(w_v * v_score + w_b * b_score + w_t * t_score, 3)
    
    # Determine overall label based on thresholds
    label = "Positive" if ensemble_score > 0.1 else "Negative" if ensemble_score < -0.1 else "Neutral"
    
    return {
        "vader_score": v_score,
        "blob_score": b_score,
        "bert_score": t_score,
        "bert_confidence": t_confidence,
        "ensemble_score": ensemble_score,
        "label": label
    }


def extract_entities(clean_text: str, allowed_labels: List[str]) -> List[dict]:
    """
    Extracts named entities from the text and filters them by allowed tags (e.g. PERSON, ORG).
    """
    if not clean_text:
        return []
        
    doc = spacy_nlp(clean_text)
    extracted = []
    seen = set()
    for ent in doc.ents:
        if ent.label_ in allowed_labels:
            txt_stripped = ent.text.strip()
            key = (txt_stripped, ent.label_)
            if key not in seen and txt_stripped:
                seen.add(key)
                extracted.append({
                    "text": txt_stripped,
                    "label": ent.label_
                })
    return extracted


def generate_llm_explanation(text: str, label: str) -> str:
    """
    Queries Gemini API to generate explanation for why a text matches the given label.
    """
    prompt = f"Explain why this post is {label} sentiment. Key phrases & reasoning in bullet points.\n\n{text}"
    try:
        resp = gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        return resp.text.strip()
    except Exception as e:
        return f"LLM Error: {str(e)}"


def generate_llm_summary(keyword: str, positive_posts: List[str], negative_posts: List[str], provider: str = "gemini") -> str:
    """
    Generates a brief summary of people's mood/sentiment regarding the keyword,
    by reading the top positive and negative posts. Supports Gemini or Ollama.
    """
    pos_text = "\n".join([f"- {p}" for p in positive_posts]) if positive_posts else "None"
    neg_text = "\n".join([f"- {p}" for p in negative_posts]) if negative_posts else "None"

    prompt = (
        f"You are analyzing public sentiment about the keyword '{keyword}'.\n"
        f"Here are the top most positive posts:\n{pos_text}\n\n"
        f"Here are the top most negative posts:\n{neg_text}\n\n"
        f"Provide a single brief, insightful summary (2-3 sentences) of the general mood, "
        f"what people are happy about, and what they are complaining about. Keep it concise."
    )
    try:
        return _call_llm(prompt, provider)
    except Exception as e:
        return f"Failed to generate AI summary: {str(e)}"
