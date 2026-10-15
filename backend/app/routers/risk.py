from fastapi import APIRouter, HTTPException

from app.compliance.guardrail import build_compliance_meta
from app.llm.client import get_llm_client
from app.risk_engine.market_data import MARKET_SHOCKS
from app.risk_engine.risk_score import compute_risk_score
from app.risk_engine.stress_test import list_scenarios, run_stress_test
from app.schemas import (
    RiskScoreRequest,
    RiskScoreResponse,
    StressTestRequest,
    StressTestResponse,
    MonteCarloRequest,
    MonteCarloResponse,
)

router = APIRouter(prefix="/api/risk", tags=["risk"])


def validate_asset_mix(asset_mix: list[dict]) -> None:
    if not asset_mix:
        raise HTTPException(
            status_code=400,
            detail="Asset allocation cannot be empty.",
        )

    total = sum(asset["value"] for asset in asset_mix)

    if abs(total - 100) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Asset allocation must total 100%. Current total: {total:.2f}%",
        )


@router.post("/score", response_model=RiskScoreResponse)
def calculate_risk_score(payload: RiskScoreRequest) -> RiskScoreResponse:
    asset_mix = [
        {
            "label": asset.label,
            "value": asset.value,
        }
        for asset in payload.asset_mix
    ]

    validate_asset_mix(asset_mix)

    result = compute_risk_score(asset_mix)

    meta = build_compliance_meta(
        has_sources=False,
        flagged_terms=[],
    )

    return RiskScoreResponse(
        **result,
        compliance=meta,
    )


@router.get("/scenarios")
def get_scenarios() -> list[dict]:
    return list_scenarios()


@router.post("/stress-test", response_model=StressTestResponse)
def post_stress_test(
    payload: StressTestRequest,
) -> StressTestResponse:

    if payload.scenario_id not in MARKET_SHOCKS:
        raise HTTPException(
            status_code=404,
            detail="Unknown scenario_id",
        )

    asset_mix = [
        {
            "label": asset.label,
            "value": asset.value,
        }
        for asset in payload.asset_mix
    ]

    validate_asset_mix(asset_mix)

    result = run_stress_test(
        payload.scenario_id,
        payload.portfolio_value,
        asset_mix,
    )

    llm = get_llm_client()

    narrative = llm.narrate_stress_test(
        MARKET_SHOCKS[payload.scenario_id],
        result,
    )

    meta = build_compliance_meta(
        has_sources=False,
        flagged_terms=[],
    )

    return StressTestResponse(
        **result,
        narrative=narrative,
        compliance=meta,
    )


@router.post("/monte-carlo", response_model=MonteCarloResponse)
def post_monte_carlo(payload: MonteCarloRequest) -> MonteCarloResponse:
    asset_mix = [
        {
            "label": asset.label,
            "value": asset.value,
        }
        for asset in payload.asset_mix
    ]
    validate_asset_mix(asset_mix)

    equity_pct = next((a["value"] for a in asset_mix if a["label"] == "Equity"), 0.0)
    debt_pct = next((a["value"] for a in asset_mix if a["label"] == "Debt"), 0.0)
    others_pct = next((a["value"] for a in asset_mix if a["label"] == "Others"), 0.0)

    from app.risk_engine.monte_carlo import run_monte_carlo

    result = run_monte_carlo(
        starting_value=payload.starting_value,
        equity_pct=equity_pct,
        debt_pct=debt_pct,
        others_pct=others_pct,
        horizon_years=payload.horizon_years,
        monthly_sip=payload.monthly_sip,
        target_goal=payload.target_goal,
        num_simulations=payload.num_simulations,
    )

    meta = build_compliance_meta(
        has_sources=False,
        flagged_terms=[],
    )

    return MonteCarloResponse(
        **result,
        compliance=meta,
    )