from __future__ import annotations

from app.agents.base import Trace
from app.compliance.guardrail import apply_guardrail
from app.scam.pattern_matcher import analyze_message, explain


def handle(question: str, trace: Trace) -> dict:
    trace.log("Scam Screener", "Matching against SEBI enforcement patterns")
    result = analyze_message(question)
    trace.log("Compliance Guard", "Response verified")

    explanation = explain(result["flags"])
    cleaned, meta = apply_guardrail(explanation, has_sources=False)

    key_points = [f["label"] for f in result["flags"]] or ["No known fraud patterns matched."]

    answer = f"Risk level: {result['risk_level']}. {cleaned}"

    return {
        "answer": answer,
        "key_points": key_points,
        "sources": [],
        "compliance": meta,
        "risk_level": result["risk_level"],
        "score": result["score"],
        "flags": result["flags"],
    }
