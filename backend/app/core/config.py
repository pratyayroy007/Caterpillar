from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Operator Assistant for CAT Machinery"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/cat_hackathon"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    GEMINI_API_KEY: str | None = None


    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
