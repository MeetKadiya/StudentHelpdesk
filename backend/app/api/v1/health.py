"""Health check endpoint.

GET /api/v1/health — used by docker/nginx and by monitoring (Prometheus can
scrape a separate /metrics endpoint added later; this is a plain liveness
check).
"""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
