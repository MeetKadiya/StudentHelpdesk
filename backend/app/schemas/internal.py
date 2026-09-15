"""Schema for the ai-worker write-back (BACKEND-07). Matches the contract
AI-04 proposed in api_contract.md v0.6."""

from pydantic import BaseModel, Field


class AiResultIn(BaseModel):
    graph_version: str
    decision: str = Field(..., pattern="^(auto_respond|escalate|clarify)$")
    draft_answer: str | None = None
    confidence: float | None = None
    category: str | None = None
    clarifying_question: str | None = None
    error: str | None = None


class AiResultOut(BaseModel):
    ticket_id: str
    status: str
