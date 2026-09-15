"""Application settings, loaded from environment variables.

Never hardcode secrets here — see .env.example for the expected variables.
"""

import json
from functools import lru_cache
from typing import Any, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "Student HelpDesk AI - Backend"
    ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@postgres:5432/helpdesk"

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def assemble_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("postgres://"):
                return v_stripped.replace("postgres://", "postgresql+asyncpg://", 1)
            if v_stripped.startswith("postgresql://") and not v_stripped.startswith("postgresql+"):
                return v_stripped.replace("postgresql://", "postgresql+asyncpg://", 1)
            return v_stripped
        return v

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # AI dispatch (BACKEND-07's enqueue side, 2026-08-10) — matches
    # agents/config.py's AgentSettings.AI_TASK_QUEUE default exactly.
    # Deliberately just the queue name, not a whole second settings block:
    # the backend only needs to know where to put the job, not anything
    # about how the AI pipeline processes it.
    AI_TASK_QUEUE: str = "ai_tasks"

    # Auth
    JWT_SECRET_KEY: str = "change-me-in-env"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Object storage (MinIO)
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "helpdesk-attachments"

    # CORS
    CORS_ORIGINS: Union[list[str], str] = [
        "*",
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8080",
        "http://127.0.0.1",
        "http://127.0.0.1:80",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8080",
    ]

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            v_stripped = v.strip()
            if not v_stripped or v_stripped == "*":
                return ["*"]
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                try:
                    return json.loads(v_stripped)
                except Exception:
                    pass
            return [i.strip() for i in v_stripped.split(",") if i.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
