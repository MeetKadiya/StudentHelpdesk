"""Main LangGraph graph — wires the four AI-01 nodes together in the order
fixed by task_board.md: retriever -> specialist router -> specialist agent
-> supervisor/escalation decision -> END.

This is a linear graph (no conditional branching back to earlier nodes)
for v1. A future version might loop back to the specialist node after a
CLARIFY decision once the student replies, but that's a ticket-level
conversation loop the ai-worker (AI-04) would drive by re-invoking the
graph on the follow-up message — not a graph-internal loop. Flagged here,
not built here, since it's an AI-04-scope design tradeoff.
"""
from __future__ import annotations

from langgraph.graph import END, StateGraph

from agents.config import AgentSettings, get_agent_settings
from agents.llm.provider import LLMProvider, get_llm_provider
from agents.nodes.retriever import NullRetriever, Retriever, build_retriever_node
from agents.nodes.router import build_router_node
from agents.nodes.specialist import build_specialist_node
from agents.nodes.supervisor import build_supervisor_node
from agents.state.graph_state import AgentState


def build_graph(
    *,
    llm: LLMProvider | None = None,
    retriever: Retriever | None = None,
    settings: AgentSettings | None = None,
):
    """Constructs and compiles the graph.

    All three dependencies are optional and default to real
    implementations (get_llm_provider / NullRetriever / get_agent_settings)
    so `build_graph()` with no args gives a runnable graph — callers
    (tests, AI-04) can override any of them, most commonly `retriever`
    once AI-02/AI-03 provide a real FAISS-backed one.
    """
    settings = settings or get_agent_settings()
    llm = llm or get_llm_provider(settings)
    retriever = retriever or NullRetriever()

    graph = StateGraph(AgentState)

    graph.add_node("retriever", build_retriever_node(retriever))
    graph.add_node("router", build_router_node(llm))
    graph.add_node("specialist", build_specialist_node(llm))
    graph.add_node("supervisor", build_supervisor_node(settings))

    graph.set_entry_point("retriever")
    graph.add_edge("retriever", "router")
    graph.add_edge("router", "specialist")
    graph.add_edge("specialist", "supervisor")
    graph.add_edge("supervisor", END)

    return graph.compile()
