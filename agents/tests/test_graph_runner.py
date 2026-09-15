from __future__ import annotations

from agents.config import get_agent_settings
from agents.nodes.retriever import NullRetriever
from agents.rag.retriever_adapter import FaissRetriever
from agents.state.graph_state import Decision, SpecialistCategory
from agents.worker.graph_runner import (
    _build_initial_state,
    _resolve_retriever,
    _result_payload,
    run_graph_for_ticket,
)


class FakeGraph:
    def __init__(self, final_state: dict):
        self._final_state = final_state
        self.received_state = None

    def invoke(self, state):
        self.received_state = state
        return self._final_state


class FakeBackendClient:
    def __init__(self):
        self.calls = []

    def post_ai_result(self, ticket_id, result):
        self.calls.append((ticket_id, result))


def test_build_initial_state_defaults_missing_fields():
    state = _build_initial_state({"ticket_id": "t1", "question": "help"})
    assert state["ticket_id"] == "t1"
    assert state["question"] == "help"
    assert state["conversation_history"] == []
    assert state["graph_version"] == "v1"


def test_build_initial_state_respects_provided_history_and_version():
    state = _build_initial_state(
        {
            "ticket_id": "t1",
            "question": "help",
            "conversation_history": [{"sender_type": "student", "content": "hi"}],
            "graph_version": "v2",
        }
    )
    assert state["conversation_history"] == [{"sender_type": "student", "content": "hi"}]
    assert state["graph_version"] == "v2"


def test_result_payload_normalizes_enum_members():
    final_state = {
        "decision": Decision.AUTO_RESPOND,
        "draft_answer": "Here's how.",
        "confidence": 0.9,
        "category": SpecialistCategory.IT_SUPPORT,
    }
    payload = _result_payload(final_state, graph_version="v1")
    assert payload["decision"] == "auto_respond"
    assert payload["category"] == "it_support"
    assert "clarifying_question" not in payload
    assert "error" not in payload


def test_result_payload_includes_clarifying_question_and_error_when_present():
    final_state = {
        "decision": Decision.CLARIFY,
        "draft_answer": "",
        "confidence": 0.2,
        "category": SpecialistCategory.GENERAL,
        "clarifying_question": "Can you say more?",
        "error": "retriever failed: timeout",
    }
    payload = _result_payload(final_state, graph_version="v1")
    assert payload["clarifying_question"] == "Can you say more?"
    assert payload["error"] == "retriever failed: timeout"


def test_resolve_retriever_falls_back_to_null_retriever(monkeypatch):
    def raise_not_found(settings):
        raise FileNotFoundError("no index")

    monkeypatch.setattr(FaissRetriever, "load", staticmethod(raise_not_found))
    retriever = _resolve_retriever(get_agent_settings())
    assert isinstance(retriever, NullRetriever)


def test_run_graph_for_ticket_invokes_graph_and_posts_result():
    final_state = {
        "decision": Decision.AUTO_RESPOND,
        "draft_answer": "answer",
        "confidence": 0.8,
        "category": SpecialistCategory.ACADEMIC,
    }
    graph = FakeGraph(final_state)
    backend_client = FakeBackendClient()

    job = {"ticket_id": "t123", "question": "when is the exam?"}
    result = run_graph_for_ticket(job, graph=graph, backend_client=backend_client)

    assert graph.received_state["ticket_id"] == "t123"
    assert graph.received_state["question"] == "when is the exam?"
    assert result["decision"] == "auto_respond"
    assert backend_client.calls == [("t123", result)]
