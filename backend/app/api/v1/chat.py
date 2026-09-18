"""AI Campus Chatbot Endpoint. Exposes POST /api/v1/chat."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas.chat import ChatRequest, ChatResponse
from app.services import chat_service

router = APIRouter()


@router.post("", response_model=ChatResponse)
async def chat_message(
    payload: ChatRequest,
) -> ChatResponse:
    """Processes student inquiries and returns intelligent, structured answers
    complete with interactive action buttons and deep campus context."""
    return chat_service.process_chat_message(payload)
