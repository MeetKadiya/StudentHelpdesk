"""Agents module settings, loaded from environment variables.

Never hardcode secrets here — see agents/.env.example for expected vars.

NOTE on env file wiring: docker/docker-compose.yml currently points the
ai-worker service at ../backend/.env (shared with the FastAPI backend).
AI-04 needed REDIS_URL/AI_TASK_QUEUE/BACKEND_INTERNAL_BASE_URL below, none
of which exist in backend/.env.example — so that sharing was already
incomplete before this session, not just "not decided" as AI-01 flagged
it. Recommending (not changing docker-compose.yml myself, that's Claude-4's
file) that DEVOPS-02 give ai-worker its own env_file: agents/.env. This
class reads its own env vars regardless of which physical .env file
supplies them, so agents/ code works either way once that's sorted.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class AgentSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Which LLM abstraction to use — see agents/llm/provider.py.
    LLM_PROVIDER: Literal["openai", "gemini"] = "openai"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Supervisor node threshold — see agents/nodes/supervisor.py. Below this,
    # the ticket escalates to a human rather than auto-responding.
    CONFIDENCE_ESCALATION_THRESHOLD: float = 0.6

    # Bumped whenever main_graph.py's node/edge shape changes in a way that
    # matters for interpreting old agent_runs rows. Written to
    # agent_runs.graph_version by the ai-worker (AI-04).
    GRAPH_VERSION: str = "v1"

    # AI-02 (rag/ ingestion) — see agents/rag/ingest.py and
    # agents/embeddings/embedder.py. sentence-transformers is the default
    # per coding_standards.md; the model name is config, not hardcoded,
    # so it can change without touching ingestion/retrieval code.
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    CHUNK_SIZE: int = 800  # characters, approx — see agents/rag/chunker.py
    CHUNK_OVERLAP: int = 100
    FAISS_INDEX_PATH: str = "knowledgebase/embeddings/index.faiss"
    FAISS_METADATA_PATH: str = "knowledgebase/metadata/chunks.jsonl"

    # AI-04 (ai-worker) — see agents/worker/.
    REDIS_URL: str = "redis://redis:6379/0"  # "redis" = compose service name
    AI_TASK_QUEUE: str = "ai_tasks"
    BACKEND_INTERNAL_BASE_URL: str = "http://fastapi-backend:8000"
    BACKEND_WRITE_BACK_TIMEOUT_SECONDS: float = 10.0


@lru_cache
def get_agent_settings() -> AgentSettings:
    return AgentSettings()
