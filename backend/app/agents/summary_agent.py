from __future__ import annotations

from app.agents.base import Trace
from app.compliance.guardrail import apply_guardrail
from app.llm.client import get_llm_client


def handle(question: str, trace: Trace, portfolio: dict) -> dict:
    trace.log("Summary Agent", "Composing goal-linked portfolio snapshot")
    llm = get_llm_client()
    narration = llm.narrate_portfolio_summary(portfolio)
    trace.log("Compliance Guard", "Response verified")

    headline, meta = apply_guardrail(narration["headline"], has_sources=False)
    cleaned_observations = []
    all_flagged = list(meta.flagged_terms)
    for obs in narration["observations"]:
        cleaned_obs, obs_meta = apply_guardrail(obs, has_sources=False)
        if cleaned_obs:
            cleaned_observations.append(cleaned_obs)
        all_flagged.extend(obs_meta.flagged_terms)

    meta.flagged_terms = all_flagged

    return {
        "answer": headline,
        "key_points": cleaned_observations,
        "sources": [],
        "compliance": meta,
    }
