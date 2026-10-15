"""Deterministic portfolio risk scoring.

Every number here is produced by plain arithmetic against the user's
asset allocation — there is no LLM in this module, by design. This is
the piece of the architecture that removes hallucination risk from
ClariFi's headline risk score.
"""
from __future__ import annotations

# Relative volatility weight per asset class (illustrative, not
# calibrated to a real covariance matrix — swap for real market data
# in production).
VOLATILITY_WEIGHT = {"Equity": 1.0, "Debt": 0.18, "Others": 0.45}

# Concentration is penalized once a single non-Others bucket exceeds
# this share of the portfolio.
CONCENTRATION_THRESHOLD = 0.55


def compute_volatility_score(asset_mix: list[dict]) -> float:
    """0-100. Weighted sum of allocation % x asset volatility weight,
    normalized against an all-equity (max volatility) portfolio."""
    weighted = sum(a["value"] * VOLATILITY_WEIGHT.get(a["label"], 0.5) for a in asset_mix)
    max_possible = 100 * VOLATILITY_WEIGHT["Equity"]
    return round(min(weighted / max_possible, 1.0) * 100, 1)


def compute_drawdown_exposure_score(asset_mix: list[dict]) -> float:
    """0-100. Approximates exposure to large drawdowns using the same
    volatility weighting but compressed, since drawdown risk rises
    faster than linearly with equity share."""
    equity_share = next((a["value"] for a in asset_mix if a["label"] == "Equity"), 0) / 100
    score = (equity_share ** 1.15) * 100
    return round(min(score, 100), 1)


def compute_concentration_score(asset_mix: list[dict]) -> float:
    """0-100. Penalizes any single asset class dominating the portfolio."""
    max_share = max((a["value"] for a in asset_mix), default=0) / 100
    if max_share <= CONCENTRATION_THRESHOLD:
        # Scale 0 -> threshold as 0 -> 40 (mild concern)
        return round((max_share / CONCENTRATION_THRESHOLD) * 40, 1)
    # Scale threshold -> 100% as 40 -> 100 (material concern)
    overflow = (max_share - CONCENTRATION_THRESHOLD) / (1 - CONCENTRATION_THRESHOLD)
    return round(40 + overflow * 60, 1)


def compute_risk_score(asset_mix: list[dict]) -> dict:
    """Returns the composite score (0-100), its label, and the
    breakdown components — the same shape the frontend's RiskScoreCard
    already renders.
    """
    volatility = compute_volatility_score(asset_mix)
    drawdown = compute_drawdown_exposure_score(asset_mix)
    concentration = compute_concentration_score(asset_mix)

    composite = round(0.45 * volatility + 0.35 * drawdown + 0.20 * concentration)
    composite = max(0, min(100, composite))

    if composite < 34:
        label = "Low"
    elif composite < 67:
        label = "Moderate"
    else:
        label = "High"

    factors = []
    if volatility > 60:
        factors.append("High equity allocation relative to peer portfolios")
    if concentration > 50:
        factors.append("Concentration in a small number of asset classes or sectors")
    if drawdown > 55:
        factors.append("Meaningful exposure to large historical drawdowns")
    if volatility <= 60 and concentration <= 50 and drawdown <= 55:
        factors.append("Allocation is reasonably balanced across asset classes")
    factors.append("Historical volatility measured against category benchmarks")

    return {
        "score": composite,
        "label": label,
        "breakdown": [
            {"label": "Portfolio volatility", "value": volatility},
            {"label": "Drawdown exposure", "value": drawdown},
            {"label": "Concentration", "value": concentration},
        ],
        "factors": factors,
    }
