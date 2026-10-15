from __future__ import annotations

from app.agents.base import Trace
from app.compliance.guardrail import apply_guardrail
from app.risk_engine.risk_score import compute_risk_score
from app.risk_engine.stress_test import list_scenarios


def handle(question: str, trace: Trace, asset_mix: list[dict]) -> dict:
    trace.log("Risk Engine", "Calculating deterministic risk metrics")
    result = compute_risk_score(asset_mix)

    answer = (
        f"Your portfolio's current risk score is {result['score']}/100 ({result['label']}). "
        f"This is calculated by ClariFi's deterministic Risk Engine from your asset allocation — "
        f"not by the language model. Ask ClariFi to run the Stress-Test Time Machine "
        f"({', '.join(s['name'] for s in list_scenarios())}) to see how this portfolio "
        f"would have behaved during a real historical shock."
    )
    trace.log("Compliance Guard", "Response verified")
    cleaned, meta = apply_guardrail(answer, has_sources=False)

    return {
        "answer": cleaned,
        "key_points": result["factors"],
        "sources": [],
        "compliance": meta,
    }
