from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import os

class Settings(BaseSettings):
    DATABASE_URL: str = Field(..., description="PostgreSQL Connection URL")
    REDDIT_CLIENT_ID: str = Field(..., description="Reddit Client ID")
    REDDIT_CLIENT_SECRET: str = Field(..., description="Reddit Client Secret")
    REDDIT_USER_AGENT: str = Field(..., description="Reddit User Agent")
    GEMINI_API_KEY: str = Field(..., description="Gemini API Key")

    # This configuration loads the env file relative to config.py's directory or current directory
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        extra="ignore"
    )

settings = Settings()
