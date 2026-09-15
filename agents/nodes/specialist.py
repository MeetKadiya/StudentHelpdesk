"""Specialist agent node — drafts an answer for the routed category using
specialist_prompt_v1.md, and extracts the model's self-reported confidence.

Third node in the graph, per task_board.md AI-01's stated order.
"""
from __future__ import annotations

import re

from agents.llm.prompt_loader import load_prompt
from agents.llm.provider import LLMProvider
from agents.state.graph_state import AgentState

_PROMPT = load_prompt("specialist_prompt_v1.md")

_CONFIDENCE_RE = re.compile(r"CONFIDENCE:\s*([0-9]*\.?[0-9]+)", re.IGNORECASE)


def _format_chunks(state: AgentState) -> str:
    chunks = state.get("retrieved_chunks") or []
    if not chunks:
        return "(no retrieved context)"
    return "\n".join(f"- ({c['source']}) {c['content']}" for c in chunks)


def _format_history(state: AgentState) -> str:
    history = state.get("conversation_history") or []
    if not history:
        return "(no prior messages)"
    return "\n".join(f"[{turn['sender_type']}] {turn['content']}" for turn in history)


def _parse_confidence(raw: str) -> tuple[str, float]:
    """Splits the model's answer from its trailing `CONFIDENCE: <float>`
    line. If the model didn't follow the format, confidence defaults to
    0.0 (fail closed — an unparseable confidence should escalate, not
    auto-respond) rather than guessing a middling value."""
    match = _CONFIDENCE_RE.search(raw)
    if not match:
        return raw.strip(), 0.0

    answer = raw[: match.start()].strip()
    try:
        confidence = float(match.group(1))
    except ValueError:
        return answer, 0.0

    return answer, max(0.0, min(1.0, confidence))


def build_specialist_node(llm: LLMProvider):
    """Returns a LangGraph-compatible node: (AgentState) -> dict patch."""

    def specialist_node(state: AgentState) -> dict:
        category = state.get("category")
        system = _PROMPT.system.format(category=category.value if category else "general")
        user_prompt = _PROMPT.user_template.format(
            question=state["question"],
            conversation_history=_format_history(state),
            retrieved_context=_format_chunks(state),
        )
        try:
            raw = llm.complete(user_prompt, system=system)
        except Exception as exc:  # noqa: BLE001 - node boundary, must not crash the graph
            return {
                "draft_answer": "",
                "confidence": 0.0,
                "error": f"specialist failed: {exc}",
            }

        answer, confidence = _parse_confidence(raw)
        return {"draft_answer": answer, "confidence": confidence}

    return specialist_node
