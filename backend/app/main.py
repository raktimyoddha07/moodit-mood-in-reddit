from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import engine, Base, get_db
from app import models  # Ensure all models are registered on Base.metadata
from app.config import settings

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
