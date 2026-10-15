"""ML Insights endpoints — Feature A (financial risk classification)."""
from __future__ import annotations

from fastapi import APIRouter

from app.ml.risk_classifier import optimize_rebalancing, predict_risk
from app.schemas import RebalanceRequest, RebalanceResponse, RiskPredictRequest, RiskPredictResponse

router = APIRouter(prefix="/api/ml", tags=["ml"])


@router.post("/risk-predict", response_model=RiskPredictResponse)
def risk_predict(payload: RiskPredictRequest) -> RiskPredictResponse:
    result = predict_risk(
        equity=payload.equity,
        debt=payload.debt,
        others=payload.others,
        horizon_years=payload.horizon_years,
        num_assets=payload.num_assets,
    )
    return RiskPredictResponse(**result)


@router.post("/rebalance", response_model=RebalanceResponse)
def rebalance(payload: RebalanceRequest) -> RebalanceResponse:
    result = optimize_rebalancing(
        equity=payload.equity,
        debt=payload.debt,
        others=payload.others,
        target_label=payload.target_label,
        horizon_years=payload.horizon_years,
        num_assets=payload.num_assets,
    )
    return RebalanceResponse(**result)
