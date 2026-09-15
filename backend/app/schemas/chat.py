"""Request and response schemas for AI Campus Chatbot."""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class ChatAction(BaseModel):
    label: str
    action_type: Literal[
        "navigate",
        "open_service",
        "create_ticket",
        "pay_fees",
        "download_hall_ticket",
        "view_attendance",
    ]
    target: str | None = None
    payload: dict[str, Any] | None = None


class ChatMessageItem(BaseModel):
    sender: Literal["user", "assistant"]
    content: str
    timestamp: str | None = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: list[ChatMessageItem] = Field(default_factory=list)
    user_context: dict[str, Any] | None = None


class ChatResponse(BaseModel):
    reply: str
    category: str
    confidence: float = 0.95
    actions: list[ChatAction] = Field(default_factory=list)
    suggested_queries: list[str] = Field(default_factory=list)
