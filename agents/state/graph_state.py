"""Shared LangGraph state schema for the multi-agent graph.

This is the (state) in coding_standards.md's "each agent node is a pure
function of (state) -> (state patch)" rule. Every node in agents/nodes/
takes an AgentState (or a subset via **kwargs unpacking) and returns a
dict patch merged back into it by LangGraph.

Field names are deliberately close to database_schema.md's `tickets`,
`messages`, and `agent_runs` tables so the ai-worker (AI-04, not yet
built) has an easy, low-mapping-risk job translating this state into DB
writes. See agents/README.md "Handoff to AI-04" for the exact mapping.
"""
from __future__ import annotations

from enum import Enum
from typing import Literal, TypedDict


class SpecialistCategory(str, Enum):
    """Finalizes requirements.md FR-13's open specialist-category list.

    Recorded here (not requirements.md, which is not to be silently
    rewritten) and cross-referenced in project_status.md's architecture
    decision log per coding_standards.md.
    """

    ACADEMIC = "academic"
    IT_SUPPORT = "it_support"
    ADMISSIONS_ENROLLMENT = "admissions_enrollment"
    FINANCIAL_AID_BILLING = "financial_aid_billing"
    GENERAL = "general"  # catch-all / low-confidence routing fallback


class Decision(str, Enum):
    """Supervisor node's output — see agents/nodes/supervisor.py."""

    AUTO_RESPOND = "auto_respond"
    ESCALATE = "escalate"
    CLARIFY = "clarify"


class RetrievedChunk(TypedDict):
    """One RAG hit. Shape matches what rag/retriever/ (AI-02/AI-03, not yet
    built) is expected to return — a Claude-2 coordination point, not a
    finalized contract; update here if AI-02/AI-03 lands something
    different."""

    content: str
    source: str  # knowledgebase_documents.title or storage_key
    score: float  # similarity score, higher = more relevant


class ConversationTurn(TypedDict):
    """One prior message on the ticket, matching messages.sender_type."""

    sender_type: Literal["student", "ai_agent", "staff"]
    content: str


class AgentState(TypedDict, total=False):
    """Full graph state. `total=False` because nodes populate this
    incrementally — a freshly-enqueued job only has the first four fields;
    later fields fill in as the graph runs.
    """

    # Set by whoever enqueues the job (ai-worker, AI-04) before the graph starts.
    ticket_id: str
    question: str
    conversation_history: list[ConversationTurn]
    graph_version: str  # matches agent_runs.graph_version

    # Set by nodes/retriever.py
    retrieved_chunks: list[RetrievedChunk]

    # Set by nodes/router.py
    category: SpecialistCategory

    # Set by nodes/specialist.py
    draft_answer: str
    confidence: float  # 0.0-1.0, matches agent_runs.confidence

    # Set by nodes/supervisor.py
    decision: Decision
    clarifying_question: str  # only set when decision == CLARIFY

    # Set by any node on failure — matches agent_runs.status == 'error'
    error: str
