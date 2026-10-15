"""The Compliance & Explainability Guardrail.

Per the ClariFi architecture, every agent's output passes through this
shared layer before reaching the user. It has three jobs:

1. Scan generated text for explicit buy/sell language and strip it.
2. Verify the response is source-grounded (has citations) when the
   agent type requires it (Product Explainer) — otherwise mark
   `source_grounded=False` so the frontend can be transparent about it.
3. Attach the standard disclaimer and an explainability flag so the
   frontend's "Why this score?" / "How did ClariFi detect this?"
   affordances always have something real to show.
"""
from __future__ import annotations

import logging

from app.compliance.rules import COMPILED_ADVICE_PATTERNS, DISCLAIMER
from app.schemas import ComplianceMeta

logger = logging.getLogger("clarifi.compliance")


def scrub_advice_language(text: str) -> tuple[str, list[str]]:
    """Removes sentences containing explicit buy/sell advice patterns.
    Returns (cleaned_text, flagged_terms)."""
    flagged: list[str] = []
    sentences = _split_sentences(text)
    kept = []
    for sentence in sentences:
        matched = False
        for pattern in COMPILED_ADVICE_PATTERNS:
            m = pattern.search(sentence)
            if m:
                matched = True
                flagged.append(m.group(0))
        if not matched:
            kept.append(sentence)
        else:
            logger.warning("Compliance guardrail stripped a sentence: %r", sentence)
    return " ".join(kept).strip(), flagged


def _split_sentences(text: str) -> list[str]:
    # Simple splitter; good enough for guardrail purposes without adding
    # an NLP dependency.
    import re

    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p for p in parts if p]


def build_compliance_meta(
    *,
    has_sources: bool,
    flagged_terms: list[str],
    explainability_available: bool = True,
) -> ComplianceMeta:
    return ComplianceMeta(
        source_grounded=has_sources,
        explainability_available=explainability_available,
        disclaimer=DISCLAIMER,
        flagged_terms=flagged_terms,
    )


def apply_guardrail(text: str, *, has_sources: bool) -> tuple[str, ComplianceMeta]:
    cleaned, flagged = scrub_advice_language(text)
    meta = build_compliance_meta(has_sources=has_sources, flagged_terms=flagged)
    return cleaned, meta
