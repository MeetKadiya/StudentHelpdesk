"""Internal-only endpoints for the ai-worker (BACKEND-07). NOT routed
through nginx/api_v1 — mounted directly at /internal/v1 in app/main.py.
No auth dependency: relies on network-level isolation (ai-worker and
backend share the docker-compose `helpdesk-net` bridge network; nginx
only forwards /api/ and /, never /internal/) — a DEVOPS concern per
api_contract.md, not solved with app-level auth here. Matches
agents/service/main.py's faiss-service, which takes the same
internal-network-only approach.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.internal import AiResultIn, AiResultOut
from app.services import ai_result_service
from app.services.ai_result_service import AiResultError

router = APIRouter()


@router.post("/tickets/{ticket_id}/ai-result", response_model=AiResultOut)
async def receive_ai_result(
    ticket_id: uuid.UUID,
    payload: AiResultIn,
    db: AsyncSession = Depends(get_db),
) -> AiResultOut:
    try:
        ticket = await ai_result_service.apply_ai_result(db, ticket_id, payload)
    except AiResultError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return AiResultOut(ticket_id=str(ticket.id), status=ticket.status)
