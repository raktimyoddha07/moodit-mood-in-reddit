// lib/api.ts – typed API client for the Moodit backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SearchPayload {
  keyword: string;
  subreddit?: string | null;
  time_window: string;
  post_count: number;
  entity_filters: string[];
  w_vader: number;
  w_blob: number;
  w_bert: number;
}

export interface SearchStatus {
  id: number;
  keyword: string;
  source: string;
  subreddit: string | null;
  time_window: string;
  post_count: number;
  entity_filters: string[];
  w_vader: number;
  w_blob: number;
  w_bert: number;
  status: "pending" | "running" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SentimentScore {
  vader_score: number;
  blob_score: number;
  bert_score: number;
  bert_confidence: number;
  ensemble_score: number;
  label: "Positive" | "Neutral" | "Negative";
}

export interface Entity {
  text: string;
  label: string;
}

export interface Post {
  id: number;
  reddit_id: string;
  title: string;
  selftext: string;
  text: string;
  created_utc: string;
  sentiment: SentimentScore;
  entities: Entity[];
  explanation: string | null;
}

export interface Summary {
  total_posts: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  positive_percentage: number;
  neutral_percentage: number;
  negative_percentage: number;
}

export interface SearchResults {
  search_request: SearchStatus;
  summary: Summary | null;
  posts: Post[];
  status?: string;
  error_message?: string | null;
}

export async function createSearch(payload: SearchPayload): Promise<SearchStatus> {
  const res = await fetch(`${API_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create search");
  }
  return res.json();
}

export async function getSearchStatus(id: number): Promise<SearchStatus> {
  const res = await fetch(`${API_URL}/api/search/${id}`);
  if (!res.ok) throw new Error("Failed to fetch status");
  return res.json();
}

export async function getSearchResults(id: number): Promise<SearchResults> {
  const res = await fetch(`${API_URL}/api/search/${id}/results`);
  if (!res.ok) throw new Error("Failed to fetch results");
  return res.json();
}
