from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class SearchRequestCreate(BaseModel):
    keyword: str
    subreddit: Optional[str] = None
    time_window: str = "Last 24h"
    post_count: int = 50
    entity_filters: List[str] = Field(default_factory=list)
    w_vader: float = 0.4
    w_blob: float = 0.3
    w_bert: float = 0.3

class SearchRequestResponse(BaseModel):
    id: int
    keyword: str
    source: str
    subreddit: Optional[str]
    time_window: str
    post_count: int
    entity_filters: List[str]
    w_vader: float
    w_blob: float
    w_bert: float
    status: str
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
