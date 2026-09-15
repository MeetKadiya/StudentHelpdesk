"""Supervisor / escalation node — final node in the graph. Pure decision
logic, no LLM call: takes the specialist's confidence and decides whether
to auto-respond, escalate to a human, or ask a clarifying question.

Per requirements.md FR-12: "Low-confidence or out-of-scope questions are
escalated to a human ... not silently guessed." This node is where that
requirement is actually enforced.
"""
from __future__ import annotations

from agents.config import AgentSettings
from agents.state.graph_state import AgentState, Decision

# A specialist answer with literally nothing behind it (empty string, or
# the parse-failure default of 0.0 confidence from specialist.py) should
# never auto-respond, no matter how the threshold is configured.
_MIN_VIABLE_CONFIDENCE = 0.0


def build_supervisor_node(settings: AgentSettings):
    """Returns a LangGraph-compatible node: (AgentState) -> dict patch."""

    def supervisor_node(state: AgentState) -> dict:
        if state.get("error"):
            # An earlier node already failed — don't compound it with a
            # confident-sounding decision. Escalate so a human sees it.
            return {"decision": Decision.ESCALATE}

        confidence = state.get("confidence", 0.0)
        draft_answer = state.get("draft_answer", "")

        if not draft_answer or confidence <= _MIN_VIABLE_CONFIDENCE:
            return {"decision": Decision.ESCALATE}

        if confidence >= settings.CONFIDENCE_ESCALATION_THRESHOLD:
            return {"decision": Decision.AUTO_RESPOND}

        # Mid-range confidence: not confident enough to auto-respond, but
        # not zero either — a clarifying question can sometimes resolve
        # this without a human, per requirements.md FR-3's "confidence/
        # source indication" and the graph's stated clarify option
        # (architecture.md §4 step 3).
        return {
            "decision": Decision.CLARIFY,
            "clarifying_question": (
                "Could you provide a bit more detail about your question? "
                "That'll help me give you a more accurate answer."
            ),
        }

    return supervisor_node
