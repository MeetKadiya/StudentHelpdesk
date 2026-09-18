import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

import app.db.models
from app.api.internal import router as internal_router
from app.api.v1 import api_router
from app.core.config import get_settings
from app.db.session import Base, engine

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            if "postgresql" in settings.DATABASE_URL or "postgres" in settings.DATABASE_URL:
                await conn.execute(
                    text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS branch VARCHAR(100);")
                )
                await conn.execute(
                    text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS semester VARCHAR(50);")
                )
                await conn.execute(
                    text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS forwarded_to VARCHAR(50);")
                )
                await conn.execute(
                    text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS clerk_notes VARCHAR(1000);")
                )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Database schema auto-creation notice: %s", exc)
    yield


app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)
# Deliberately NOT under settings.API_V1_PREFIX / nginx's /api/ routing —
# see app/api/internal.py's module docstring (BACKEND-07).
app.include_router(internal_router, prefix="/internal/v1")


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": settings.APP_NAME, "status": "running"}
