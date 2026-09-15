"""FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.internal import router as internal_router
from app.api.v1 import api_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)

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
