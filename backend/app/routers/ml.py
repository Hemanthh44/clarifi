"""ML Insights endpoints — Supervised & Reinforcement Learning suite."""
from __future__ import annotations

from fastapi import APIRouter

from app.ml.risk_classifier import optimize_rebalancing, predict_risk
from app.ml.rl_agent import ACTIONS, REGIMES, get_trained_rl_agent, simulate_rl_portfolio
from app.schemas import (
    RLSimulateRequest,
    RLSimulateResponse,
    RebalanceRequest,
    RebalanceResponse,
    RiskPredictRequest,
    RiskPredictResponse,
)

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


@router.post("/rl/simulate", response_model=RLSimulateResponse)
def rl_simulate(payload: RLSimulateRequest) -> RLSimulateResponse:
    """Runs a multi-year dynamic policy simulation using the trained Q-Learning RL agent."""
    result = simulate_rl_portfolio(
        starting_value=payload.starting_value,
        equity=payload.equity,
        debt=payload.debt,
        others=payload.others,
        horizon_years=payload.horizon_years,
        monthly_sip=payload.monthly_sip,
        risk_tolerance=payload.risk_tolerance,
    )
    return RLSimulateResponse(**result)


@router.get("/rl/info")
def rl_info() -> dict:
    """Returns RL formulation metadata, action catalog, and market regimes."""
    agent = get_trained_rl_agent()
    return {
        "model_type": "Tabular Q-Learning (Markov Decision Process)",
        "actions": ACTIONS,
        "regimes": REGIMES,
        "gamma": agent.gamma,
        "alpha": agent.alpha,
        "epsilon_min": agent.epsilon_min,
        "convergence": agent.training_convergence[-5:],
    }


@router.get("/market/live-pulse")
def market_live_pulse() -> dict:
    """Returns real-time benchmark quotes (NIFTY 50, SENSEX, VIX, Gold) and live regime."""
    from app.risk_engine.live_market import get_live_market_pulse

    return get_live_market_pulse()
