"""Deterministic Stress-Test Time Machine engine.

Applies a historical shock's per-asset-class impact percentages to the
user's actual asset mix and portfolio value. All arithmetic — no LLM
involved. The LLM layer (see app/llm/client.py) only narrates the
result in plain language afterwards.
"""
from __future__ import annotations

from app.risk_engine.market_data import MARKET_SHOCKS


def run_stress_test(scenario_id: str, portfolio_value: float, asset_mix: list[dict]) -> dict:
    if scenario_id not in MARKET_SHOCKS:
        raise ValueError(f"Unknown scenario_id: {scenario_id}")

    scenario = MARKET_SHOCKS[scenario_id]
    shocks = scenario["asset_shock_pct"]

    asset_impact = []
    weighted_impact_pct = 0.0
    for asset in asset_mix:
        label = asset["label"]
        weight = asset["value"] / 100
        shock_pct = shocks.get(label, -10.0)  # conservative default for unknown buckets
        weighted_impact_pct += weight * shock_pct
        asset_impact.append({"label": label, "impact_pct": round(shock_pct, 1)})

    weighted_impact_pct = round(weighted_impact_pct, 1)
    impact_value = round(portfolio_value * (1 + weighted_impact_pct / 100), 2)

    return {
        "scenario_id": scenario["id"],
        "scenario_name": scenario["name"],
        "period": scenario["period"],
        "starting_value": portfolio_value,
        "impact_value": impact_value,
        "impact_pct": weighted_impact_pct,
        "drawdown_pct": scenario["drawdown_pct"],
        "recovery_months": scenario["recovery_months"],
        "risk_score_change": scenario["risk_score_change"],
        "asset_impact": asset_impact,
    }


def list_scenarios() -> list[dict]:
    return [
        {"id": s["id"], "name": s["name"], "period": s["period"]}
        for s in MARKET_SHOCKS.values()
    ]
