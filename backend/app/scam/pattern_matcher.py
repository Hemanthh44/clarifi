"""Deterministic scam-pattern matcher.

Scores a pasted message by summing matched-pattern weights (capped at
1.0) and classifies it into a risk band. This runs entirely without an
LLM — the LLM layer only narrates *why* a message was flagged, using
the flags this module already found, never inventing new ones.
"""
from __future__ import annotations

from app.scam.patterns import COMPILED_PATTERNS


def analyze_message(message: str) -> dict:
    flags = []
    score = 0.0

    for pattern_id, label, regex, weight in COMPILED_PATTERNS:
        match = regex.search(message)
        if match:
            flags.append(
                {
                    "pattern_id": pattern_id,
                    "label": label,
                    "span": match.group(0),
                    "weight": weight,
                }
            )
            score += weight

    score = min(round(score, 2), 1.0)

    if score >= 0.55:
        risk_level = "High Risk"
    elif score >= 0.25:
        risk_level = "Suspicious Pattern"
    else:
        risk_level = "Low Risk"

    return {"risk_level": risk_level, "score": score, "flags": flags}


def explain(flags: list[dict]) -> str:
    if not flags:
        return "No known fraud-pattern matches were found in this message. Stay cautious with any unsolicited investment offer regardless."
    labels = ", ".join(f["label"].lower() for f in flags)
    return (
        f"This message matched {len(flags)} pattern(s) commonly associated with financial fraud: {labels}. "
        "These patterns echo recurring elements in SEBI investor-alert bulletins and enforcement actions "
        "against unregistered schemes."
    )
