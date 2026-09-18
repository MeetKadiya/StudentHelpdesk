"""Specialist router node — classifies the question into a
SpecialistCategory (agents/state/graph_state.py) using router_prompt_v1.md.

Second node in the graph, per task_board.md AI-01's stated order.
"""

from __future__ import annotations

from agents.llm.prompt_loader import load_prompt
from agents.llm.provider import LLMProvider
from agents.state.graph_state import AgentState, SpecialistCategory

_PROMPT = load_prompt("router_prompt_v1.md")

_VALID_SLUGS = {c.value for c in SpecialistCategory}


def _format_chunks(state: AgentState) -> str:
    chunks = state.get("retrieved_chunks") or []
    if not chunks:
        return "(no retrieved context)"
    return "\n".join(f"- ({c['source']}) {c['content']}" for c in chunks)


def build_router_node(llm: LLMProvider):
    """Returns a LangGraph-compatible node: (AgentState) -> dict patch."""

    def route_node(state: AgentState) -> dict:
        user_prompt = _PROMPT.user_template.format(
            question=state["question"],
            retrieved_context=_format_chunks(state),
        )
        try:
            raw = llm.complete(user_prompt, system=_PROMPT.system).strip().lower()
        except Exception as exc:  # noqa: BLE001 - node boundary, must not crash the graph
            return {"category": SpecialistCategory.GENERAL, "error": f"router failed: {exc}"}

        # Defensive parsing: the model is instructed to return only the
        # slug, but don't trust that blindly — fall back to GENERAL for
        # anything that doesn't match a known category rather than
        # crashing the graph or silently misrouting.
        if raw in _VALID_SLUGS:
            return {"category": SpecialistCategory(raw)}
        return {"category": SpecialistCategory.GENERAL}

    return route_node
