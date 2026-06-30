from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from sqlalchemy.orm import selectinload

from app.database import engine, Base, get_db
from app import models  # Ensure all models are registered on Base.metadata
from app.config import settings
from app.schemas import SearchRequestCreate, SearchRequestResponse
from app.models import SearchRequest, PostSentimentResult, ExtractedEntity, LlmExplanation
from app.pipeline import run_analysis_pipeline

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: Clean up connections
    await engine.dispose()

app = FastAPI(
    title="Moodit API",
    description="Backend API for the Reddit Sentiment Analysis Rebuild",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS so the Next.js frontend can connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        # Perform a basic query to verify database connectivity
        result = await db.execute(text("SELECT 1"))
        await db.commit()
        return {
            "status": "healthy",
            "database": "connected",
            "message": "FastAPI is running and database is reachable"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database connection failed: {str(e)}"
        )

@app.post("/api/search", response_model=SearchRequestResponse)
async def create_search(
    request: SearchRequestCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new SearchRequest and runs the analysis pipeline as a background task.
    """
    db_search = SearchRequest(
        keyword=request.keyword,
        source="reddit",
        subreddit=request.subreddit,
        time_window=request.time_window,
        post_count=request.post_count,
        entity_filters=request.entity_filters,
        w_vader=request.w_vader,
        w_blob=request.w_blob,
        w_bert=request.w_bert,
        status="pending"
    )
    db.add(db_search)
    await db.commit()
    await db.refresh(db_search)
    
    # Run the analysis pipeline in the background using FastAPI's BackgroundTasks
    background_tasks.add_task(run_analysis_pipeline, db_search.id)
    
    return db_search

@app.get("/api/search/{search_id}", response_model=SearchRequestResponse)
async def get_search_status(
    search_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the status metadata of a specific search request.
    """
    result = await db.execute(select(SearchRequest).where(SearchRequest.id == search_id))
    db_search = result.scalar_one_or_none()
    if not db_search:
        raise HTTPException(status_code=404, detail="Search request not found")
    return db_search

@app.get("/api/search/{search_id}/results")
async def get_search_results(
    search_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the analysis results for a completed search request.
    """
    # Fetch SearchRequest
    result = await db.execute(select(SearchRequest).where(SearchRequest.id == search_id))
    search_req = result.scalar_one_or_none()
    if not search_req:
        raise HTTPException(status_code=404, detail="Search request not found")
        
    if search_req.status != "completed":
        return {
            "search_request": SearchRequestResponse.model_validate(search_req),
            "status": search_req.status,
            "error_message": search_req.error_message,
            "summary": None,
            "posts": []
        }
        
    # Fetch sentiment results with their linked posts
    sentiment_result = await db.execute(
        select(PostSentimentResult)
        .options(selectinload(PostSentimentResult.post))
        .where(PostSentimentResult.search_id == search_id)
    )
    sent_results = sentiment_result.scalars().all()
    
    # Fetch entities
    entities_result = await db.execute(
        select(ExtractedEntity).where(ExtractedEntity.search_id == search_id)
    )
    entities = entities_result.scalars().all()
    
    # Group entities by post_id
    entities_by_post = {}
    for ent in entities:
        entities_by_post.setdefault(ent.post_id, []).append({
            "text": ent.text,
            "label": ent.label
        })
        
    # Fetch explanations
    explanations_result = await db.execute(
        select(LlmExplanation).where(LlmExplanation.search_id == search_id)
    )
    explanations = explanations_result.scalars().all()
    explanations_by_post = {exp.post_id: exp.explanation for exp in explanations}
    
    # Compute aggregate summary metrics
    total_posts = len(sent_results)
    positives = sum(1 for r in sent_results if r.label == "Positive")
    neutrals = sum(1 for r in sent_results if r.label == "Neutral")
    negatives = sum(1 for r in sent_results if r.label == "Negative")
    
    summary = {
        "total_posts": total_posts,
        "positive_count": positives,
        "neutral_count": neutrals,
        "negative_count": negatives,
        "positive_percentage": round(positives / total_posts, 3) if total_posts > 0 else 0.0,
        "neutral_percentage": round(neutrals / total_posts, 3) if total_posts > 0 else 0.0,
        "negative_percentage": round(negatives / total_posts, 3) if total_posts > 0 else 0.0,
    }
    
    # Build list of post detail results
    posts_list = []
    for r in sent_results:
        post = r.post
        posts_list.append({
            "id": post.id,
            "reddit_id": post.reddit_id,
            "title": post.title,
            "selftext": post.selftext,
            "text": post.text,
            "created_utc": post.created_utc,
            "sentiment": {
                "vader_score": r.vader_score,
                "blob_score": r.blob_score,
                "bert_score": r.bert_score,
                "bert_confidence": r.bert_confidence,
                "ensemble_score": r.ensemble_score,
                "label": r.label
            },
            "entities": entities_by_post.get(post.id, []),
            "explanation": explanations_by_post.get(post.id, None)
        })
        
    return {
        "search_request": SearchRequestResponse.model_validate(search_req),
        "summary": summary,
        "posts": posts_list
    }

