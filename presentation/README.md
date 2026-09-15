# Presentation & Demo Material (PRESENTATION-01)

`student-helpdesk-ai-presentation.pptx` — a 12-slide deck covering the
problem, architecture, AI pipeline, tech stack, role-based features,
security, cloud strategy, verification approach, requirements coverage,
and known gaps, closing with a 4-step live demo script.

## Contents

1. Title
2. The Problem, and What We Built
3. System Architecture
4. The AI Pipeline — 4 Nodes, One LangGraph (includes the ARCH/AI-05
   scope-decision reasoning)
5. Technology Stack
6. One System, Three Roles (student / faculty / admin)
7. Security & Data Isolation
8. Cloud Strategy: Dev Today, AWS-Ready
9. Verified by Running It, Not Just Reading It (real bugs caught by
   actually running code, not just reading it)
10. Requirements Coverage (31/36 fully met, disclosed partial/not-built)
11. Known Gaps — Disclosed, Not Hidden
12. Live Demo (closing slide — full demo script is in this slide's
    speaker notes)

Every factual claim in the deck is drawn directly from
`project-management/requirements.md`, `task_board.md`, and the
`docs/assignment-report/` this deck summarizes — nothing here is
independently invented or more optimistic than what those documents
already establish.

## Demo script

The full step-by-step demo script (sign up → ask a question → AI
resolves or escalates → faculty responds → mark verified → check
analytics) is in slide 12's speaker notes, so it travels with the deck
itself rather than living in a separate file that could drift out of
sync.

## Verification performed

Structural/content validation via the pptx skill's own tooling: schema
validation (passed), full text-content extraction and read-through (no
placeholder text, no lorem ipsum, every number matches the source docs),
and a full visual QA pass — every slide rendered to an image and
inspected individually, catching and fixing two real issues before
finalizing (icons rendering solid black due to an SVG-color-stripping bug
in the icon-generation script, and a low-contrast chart label) rather
than shipped as first-drafted.
