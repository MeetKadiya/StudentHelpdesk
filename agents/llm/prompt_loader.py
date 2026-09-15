"""Tiny loader for the versioned prompt templates in agents/prompts/.

Keeps nodes from hardcoding file paths or duplicating the "## System
prompt" / "## User prompt template" parsing convention used across all
prompt files.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

SYSTEM_HEADER = "## System prompt"
USER_HEADER = "## User prompt template"


@dataclass(frozen=True)
class PromptTemplate:
    system: str
    user_template: str


def load_prompt(filename: str) -> PromptTemplate:
    """filename example: 'router_prompt_v1.md'"""
    path = PROMPTS_DIR / filename
    text = path.read_text(encoding="utf-8")

    if SYSTEM_HEADER not in text or USER_HEADER not in text:
        raise ValueError(
            f"{filename} is missing the expected '{SYSTEM_HEADER}' / "
            f"'{USER_HEADER}' sections."
        )

    _, rest = text.split(SYSTEM_HEADER, 1)
    system_part, user_part = rest.split(USER_HEADER, 1)

    return PromptTemplate(system=system_part.strip(), user_template=user_part.strip())
