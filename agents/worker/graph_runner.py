"""AI-04 — ai-worker task logic, deliberately decoupled from Celery so
it's directly unit-testable without a broker (same split AI-01 used: pure
node functions, thin graph wiring). agents/worker/celery_app.py wraps
run_graph_for_ticket() as a task; nothing in this module imports celery.

Retriever wiring decision (flagged as open by AI-03): in-process
FaissRetriever, not an HTTP call to agents/service's faiss-service —
avoids an extra network hop and an extra dependency (faiss-service being
up) for something that runs in the same container image anyway. Falls
back to NullRetriever if no index has been built yet (ingest() hasn't run
/ FaissRetriever.load() raises FileNotFoundError) rather than crashing
the job outright — an ungrounded low-confidence answer that escalates to
a human is a safer failure mode than a hard worker crash on day one, when
knowledgebase/ is still empty. Revisit once ARCH-DECISION-02 settles and
there's a real case for calling out to a separately-scaled faiss-service.
"""

from __future__ import annotations

import logging

from agents.config import AgentSettings, get_agent_settings
from agents.graphs.main_graph import build_graph
from agents.nodes.retriever import NullRetriever, Retriever
from agents.rag.retriever_adapter import FaissRetriever
from agents.state.graph_state import AgentState
from agents.worker.backend_client import BackendClient

logger = logging.getLogger(__name__)


def _resolve_retriever(settings: AgentSettings) -> Retriever:
    try:
        return FaissRetriever.load(settings)
    except FileNotFoundError:
        logger.warning(
            "No FAISS index found at %s; falling back to NullRetriever for "
            "this run (run `python -m agents.rag.ingest` to build one).",
            settings.FAISS_INDEX_PATH,
        )
        return NullRetriever()


def _build_initial_state(job: dict) -> AgentState:
    return AgentState(
        ticket_id=job["ticket_id"],
        question=job["question"],
        conversation_history=job.get("conversation_history", []),
        graph_version=job.get("graph_version", "v1"),
    )


def _result_payload(final_state: dict, *, graph_version: str) -> dict:
    """Builds the write-back body per api_contract.md v0.6. Enum members
    (Decision/SpecialistCategory from graph_state.py) aren't JSON-
    serializable as-is — normalized to their .value here so BackendClient
    can json-encode this dict directly."""
    payload: dict = {
        "graph_version": graph_version,
        "decision": final_state.get("decision"),
        "draft_answer": final_state.get("draft_answer", ""),
        "confidence": final_state.get("confidence", 0.0),
        "category": final_state.get("category"),
    }
    if final_state.get("clarifying_question"):
        payload["clarifying_question"] = final_state["clarifying_question"]
    if final_state.get("error"):
        payload["error"] = final_state["error"]

    for key in ("decision", "category"):
        value = payload.get(key)
        if hasattr(value, "value"):
            payload[key] = value.value

    return payload


def run_graph_for_ticket(
    job: dict,
    *,
    graph=None,
    backend_client: BackendClient | None = None,
    settings: AgentSettings | None = None,
) -> dict:
    """Runs the LangGraph pipeline for one job and posts the result back to
    the backend. Returns the same result payload that was posted (useful
    for logging/tests). `graph` and `backend_client` are injectable —
    production callers (celery_app.py) leave both None and get the real
    ones; tests inject fakes so no LLM/API key/broker is needed."""
    settings = settings or get_agent_settings()
    backend_client = backend_client or BackendClient(settings)

    if graph is None:
        graph = build_graph(retriever=_resolve_retriever(settings), settings=settings)

    initial_state = _build_initial_state(job)
    final_state = graph.invoke(initial_state)

    result = _result_payload(final_state, graph_version=initial_state["graph_version"])
    backend_client.post_ai_result(job["ticket_id"], result)
    return result
