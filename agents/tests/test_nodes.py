"""Tests for AI-01's node logic that doesn't require a live LLM/FAISS
call — supervisor decision thresholds, prompt-template loading, and
router/specialist parsing helpers, using fake LLMProvider/Retriever
implementations. Matches backend/tests/'s pytest convention
(coding_standards.md: files under */tests/, named test_*.py).

NOT run as part of this session (no Python environment with langgraph/
pydantic-settings installed here — see agents/requirements.txt). Written
so the next session (or CI, once DEVOPS-04 lands) can run
`pytest agents/tests` directly.
"""
from __future__ import annotations

from agents.config import AgentSettings
from agents.llm.prompt_loader import load_prompt
from agents.nodes.retriever import NullRetriever, build_retriever_node
from agents.nodes.specialist import _parse_confidence
from agents.nodes.supervisor import build_supervisor_node
from agents.state.graph_state import Decision


def test_null_retriever_returns_empty_not_error():
    node = build_retriever_node(NullRetriever())
    patch = node({"question": "How do I reset my password?"})
    assert patch == {"retrieved_chunks": []}


def test_prompt_loader_parses_both_sections():
    prompt = load_prompt("router_prompt_v1.md")
    assert "routing classifier" in prompt.system.lower()
    assert "{question}" in prompt.user_template
    assert "{retrieved_context}" in prompt.user_template


def test_parse_confidence_extracts_trailing_float():
    answer, confidence = _parse_confidence(
        "You can reset it at the IT portal.\nCONFIDENCE: 0.85"
    )
    assert answer == "You can reset it at the IT portal."
    assert confidence == 0.85


def test_parse_confidence_fails_closed_when_missing():
    answer, confidence = _parse_confidence("You can reset it at the IT portal.")
    assert confidence == 0.0


def test_supervisor_auto_responds_above_threshold():
    settings = AgentSettings(CONFIDENCE_ESCALATION_THRESHOLD=0.6)
    node = build_supervisor_node(settings)
    patch = node({"draft_answer": "Here's how...", "confidence": 0.9})
    assert patch["decision"] == Decision.AUTO_RESPOND


def test_supervisor_escalates_on_zero_confidence():
    settings = AgentSettings(CONFIDENCE_ESCALATION_THRESHOLD=0.6)
    node = build_supervisor_node(settings)
    patch = node({"draft_answer": "Here's how...", "confidence": 0.0})
    assert patch["decision"] == Decision.ESCALATE


def test_supervisor_escalates_on_prior_error():
    settings = AgentSettings(CONFIDENCE_ESCALATION_THRESHOLD=0.6)
    node = build_supervisor_node(settings)
    patch = node({"error": "retriever failed: timeout", "confidence": 0.9})
    assert patch["decision"] == Decision.ESCALATE


def test_supervisor_clarifies_mid_range_confidence():
    settings = AgentSettings(CONFIDENCE_ESCALATION_THRESHOLD=0.6)
    node = build_supervisor_node(settings)
    patch = node({"draft_answer": "Here's how...", "confidence": 0.3})
    assert patch["decision"] == Decision.CLARIFY
    assert "clarifying_question" in patch
