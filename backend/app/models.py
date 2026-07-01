from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, UniqueConstraint, JSON, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class SearchRequest(Base):
    __tablename__ = "search_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    keyword: Mapped[str] = mapped_column(String(255), index=True)
    source: Mapped[str] = mapped_column(String(50), default="reddit")
    subreddit: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    time_window: Mapped[str] = mapped_column(String(50))
    post_count: Mapped[int] = mapped_column(Integer)
    entity_filters: Mapped[List[str]] = mapped_column(JSON)
    w_vader: Mapped[float] = mapped_column(Float)
    w_blob: Mapped[float] = mapped_column(Float)
    w_bert: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, running, completed, failed
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    llm_provider: Mapped[str] = mapped_column(String(50), default="gemini")

    # Relationships
    sentiment_results: Mapped[List["PostSentimentResult"]] = relationship(
        "PostSentimentResult", back_populates="search_request", cascade="all, delete-orphan"
    )
    extracted_entities: Mapped[List["ExtractedEntity"]] = relationship(
        "ExtractedEntity", back_populates="search_request", cascade="all, delete-orphan"
    )
    llm_explanations: Mapped[List["LlmExplanation"]] = relationship(
        "LlmExplanation", back_populates="search_request", cascade="all, delete-orphan"
    )

class RedditPost(Base):
    __tablename__ = "reddit_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reddit_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    title: Mapped[str] = mapped_column(Text)
    selftext: Mapped[str] = mapped_column(Text)
    text: Mapped[str] = mapped_column(Text)
    created_utc: Mapped[datetime] = mapped_column(DateTime)

    # Relationships
    sentiment_results: Mapped[List["PostSentimentResult"]] = relationship(
        "PostSentimentResult", back_populates="post", cascade="all, delete-orphan"
    )
    extracted_entities: Mapped[List["ExtractedEntity"]] = relationship(
        "ExtractedEntity", back_populates="post", cascade="all, delete-orphan"
    )
    llm_explanations: Mapped[List["LlmExplanation"]] = relationship(
        "LlmExplanation", back_populates="post", cascade="all, delete-orphan"
    )

class PostSentimentResult(Base):
    __tablename__ = "post_sentiment_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    search_id: Mapped[int] = mapped_column(Integer, ForeignKey("search_requests.id", ondelete="CASCADE"), index=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("reddit_posts.id", ondelete="CASCADE"), index=True)
    vader_score: Mapped[float] = mapped_column(Float)
    blob_score: Mapped[float] = mapped_column(Float)
    bert_score: Mapped[float] = mapped_column(Float)
    bert_confidence: Mapped[float] = mapped_column(Float)
    ensemble_score: Mapped[float] = mapped_column(Float)
    label: Mapped[str] = mapped_column(String(50))  # Positive, Neutral, Negative

    # Relationships
    search_request: Mapped["SearchRequest"] = relationship("SearchRequest", back_populates="sentiment_results")
    post: Mapped["RedditPost"] = relationship("RedditPost", back_populates="sentiment_results")

    __table_args__ = (
        UniqueConstraint("search_id", "post_id", name="uq_search_post_sentiment"),
    )

class ExtractedEntity(Base):
    __tablename__ = "extracted_entities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    search_id: Mapped[int] = mapped_column(Integer, ForeignKey("search_requests.id", ondelete="CASCADE"), index=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("reddit_posts.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(String(255))
    label: Mapped[str] = mapped_column(String(50))

    # Relationships
    search_request: Mapped["SearchRequest"] = relationship("SearchRequest", back_populates="extracted_entities")
    post: Mapped["RedditPost"] = relationship("RedditPost", back_populates="extracted_entities")

class LlmExplanation(Base):
    __tablename__ = "llm_explanations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    search_id: Mapped[int] = mapped_column(Integer, ForeignKey("search_requests.id", ondelete="CASCADE"), index=True)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey("reddit_posts.id", ondelete="CASCADE"), index=True)
    explanation: Mapped[str] = mapped_column(Text)

    # Relationships
    search_request: Mapped["SearchRequest"] = relationship("SearchRequest", back_populates="llm_explanations")
    post: Mapped["RedditPost"] = relationship("RedditPost", back_populates="llm_explanations")

    __table_args__ = (
        UniqueConstraint("search_id", "post_id", name="uq_search_post_explanation"),
    )
