"""LLM provider abstraction — "OpenAI API abstraction" / "Gemini
abstraction" from the tech stack. Nodes call `get_llm_provider(settings)`
and only ever see the `LLMProvider` protocol, never a vendor SDK directly,
so swapping providers or adding a third one doesn't touch node code.

Neither SDK is a hard dependency of this module — imports are deferred
into each provider's __init__ so agents/ can be imported (e.g. for state
schema / graph-shape use) without either package installed. AI-02/AI-03
(FAISS/embeddings) and AI-04 (ai-worker entrypoint) are what actually run
this end-to-end with real API keys; this session (AI-01) delivers the
interface + wiring, not a live-tested integration.
"""
from __future__ import annotations

from typing import Protocol

from agents.config import AgentSettings


class LLMProvider(Protocol):
    """Minimal surface every node needs: one text-in/text-out call."""

    def complete(self, prompt: str, *, system: str | None = None) -> str:
        ...


class OpenAIProvider:
    def __init__(self, settings: AgentSettings) -> None:
        try:
            from openai import OpenAI  # type: ignore[import-not-found]
        except ImportError as exc:  # pragma: no cover - environment-dependent
            raise RuntimeError(
                "OpenAIProvider requires the 'openai' package. Add it to "
                "backend/requirements.txt (or agents' own requirements once "
                "AI-04 gives agents/ its own dependency file) — not "
                "installed as part of AI-01, which only wires the "
                "interface."
            ) from exc

        if not settings.OPENAI_API_KEY:
            raise RuntimeError(
                "OPENAI_API_KEY is not set — copy agents/.env.example to "
                "agents/.env and fill it in."
            )
        self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self._model = settings.OPENAI_MODEL

    def complete(self, prompt: str, *, system: str | None = None) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        response = self._client.chat.completions.create(
            model=self._model,
            messages=messages,
        )
        return response.choices[0].message.content or ""


class GeminiProvider:
    def __init__(self, settings: AgentSettings) -> None:
        try:
            import google.generativeai as genai  # type: ignore[import-not-found]
        except ImportError as exc:  # pragma: no cover - environment-dependent
            raise RuntimeError(
                "GeminiProvider requires the 'google-generativeai' package "
                "— not installed as part of AI-01, which only wires the "
                "interface."
            ) from exc

        if not settings.GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not set — copy agents/.env.example to "
                "agents/.env and fill it in."
            )
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self._model = genai.GenerativeModel(settings.GEMINI_MODEL)

    def complete(self, prompt: str, *, system: str | None = None) -> str:
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        response = self._model.generate_content(full_prompt)
        return response.text or ""


class LocalHeuristicProvider:
    """Fallback LLM provider when no external API key (OpenAI/Gemini) is set.
    Performs deterministic, rule-based category classification and response
    drafting from retrieved context, ensuring the AI agent graph never crashes."""

    def __init__(self, settings: AgentSettings) -> None:
        self.settings = settings

    def complete(self, prompt: str, *, system: str | None = None) -> str:
        prompt_lower = (prompt + " " + (system or "")).lower()

        # Check if this is router classification
        if "routing classifier" in prompt_lower or "category:" in prompt_lower:
            q_text = prompt_lower
            if "question:" in prompt_lower:
                q_text = prompt_lower.split("question:", 1)[1].split("retrieved context:", 1)[0]

            it_keywords = ["wifi", "wi-fi", "network", "login", "password", "portal", "canvas", "vpn", "device", "laptop", "software", "account", "access", "computer", "email", "hardware", "reset", "mfa", "otp", "printer", "tech", "internet"]
            fin_keywords = ["fee", "fees", "tuition", "scholarship", "aid", "billing", "bill", "payment", "refund", "dues", "receipt", "invoice", "finance", "loan", "cost", "grant", "bursar"]
            acad_keywords = ["grade", "grades", "gpa", "course", "courses", "class", "classes", "syllabus", "professor", "faculty", "advisor", "exam", "exams", "test", "attendance", "credit", "prerequisite", "curriculum", "lecture", "homework", "assignment"]
            adm_keywords = ["admission", "admissions", "enroll", "enrollment", "apply", "application", "transcript", "transcripts", "transfer", "major", "minor", "degree", "registration", "deadline", "admit", "prospective"]

            for kw in it_keywords:
                if kw in q_text:
                    return "it_support"
            for kw in fin_keywords:
                if kw in q_text:
                    return "financial_aid_billing"
            for kw in acad_keywords:
                if kw in q_text:
                    return "academic"
            for kw in adm_keywords:
                if kw in q_text:
                    return "admissions_enrollment"
            return "general"

        # Check if this is specialist answer drafting
        if "specialist support agent" in prompt_lower or "answer:" in prompt_lower:
            chunks_text = ""
            if "retrieved context:" in prompt:
                chunks_text = prompt.split("retrieved context:", 1)[1].split("answer:", 1)[0].strip()

            has_real_context = chunks_text and "(no retrieved context)" not in chunks_text and len(chunks_text) > 10

            if has_real_context:
                first_lines = [line.strip() for line in chunks_text.splitlines() if line.strip() and not line.startswith("- (")]
                summary = " ".join(first_lines[:3]) if first_lines else chunks_text[:200]
                return f"Based on institutional records and university documentation:\n{summary}\n\nCONFIDENCE: 0.85"
            else:
                return "This student inquiry requires direct evaluation by university department staff. The ticket has been escalated for faculty assistance.\n\nCONFIDENCE: 0.35"

        return "CONFIDENCE: 0.50"


def get_llm_provider(settings: AgentSettings) -> LLMProvider:
    if settings.LLM_PROVIDER == "openai":
        if settings.OPENAI_API_KEY:
            return OpenAIProvider(settings)
        return LocalHeuristicProvider(settings)
    if settings.LLM_PROVIDER == "gemini":
        if settings.GEMINI_API_KEY:
            return GeminiProvider(settings)
        return LocalHeuristicProvider(settings)
    return LocalHeuristicProvider(settings)

