from fastapi import APIRouter, HTTPException

from app.compliance.guardrail import apply_guardrail
from app.data.database import get_portfolio, save_portfolio
from app.llm.client import get_llm_client
from app.risk_engine.risk_score import compute_risk_score
from app.schemas import PortfolioResponse, PortfolioSaveRequest, PortfolioSummaryResponse
from app.routers.history import add_history

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


def _build_portfolio(raw: dict) -> dict:
    asset_mix = [
        {"label": "Equity", "value": raw["equity"]},
        {"label": "Debt", "value": raw["debt"]},
        {"label": "Others", "value": raw["others"]},
    ]
    risk = compute_risk_score(asset_mix)
    return {
        "value": raw["value"],
        "assetMix": asset_mix,
        "goals": {"onTrack": raw["goals_on_track"], "total": raw["goals_total"]},
        "riskScore": risk["score"],
        "riskLabel": risk["label"],
        "riskBreakdown": risk["breakdown"],
        "riskFactors": risk["factors"],
        "updatedAt": raw["updated_at"],
    }


@router.get("", response_model=PortfolioResponse)
def read_portfolio() -> PortfolioResponse:
    raw = get_portfolio()
    if not raw:
        raise HTTPException(status_code=404, detail="No portfolio has been created yet. Add your portfolio details first.")
    return PortfolioResponse(portfolio=_build_portfolio(raw))


@router.put("", response_model=PortfolioResponse)
def upsert_portfolio(payload: PortfolioSaveRequest) -> PortfolioResponse:
    total = payload.equity + payload.debt + payload.others
    if abs(total - 100) > 0.01:
        raise HTTPException(status_code=400, detail=f"Asset allocation must total 100%. Current total: {total:.2f}%")
    if payload.goals_on_track > payload.goals_total:
        raise HTTPException(status_code=400, detail="Goals on track cannot exceed total goals.")
    raw = save_portfolio(payload.value, payload.equity, payload.debt, payload.others,
                         payload.goals_on_track, payload.goals_total)
    add_history("Portfolio updated", "Saved portfolio allocation and goals")
    return PortfolioResponse(portfolio=_build_portfolio(raw))


@router.post("/summary", response_model=PortfolioSummaryResponse)
def generate_summary() -> PortfolioSummaryResponse:
    raw = get_portfolio()
    if not raw:
        raise HTTPException(status_code=404, detail="Create your portfolio before generating a summary.")
    portfolio = _build_portfolio(raw)
    llm = get_llm_client()
    narration = llm.narrate_portfolio_summary(portfolio)

    headline, meta = apply_guardrail(narration["headline"], has_sources=False)
    observations = []
    flagged = list(meta.flagged_terms)
    for obs in narration["observations"]:
        cleaned, obs_meta = apply_guardrail(obs, has_sources=False)
        if cleaned:
            observations.append(cleaned)
        flagged.extend(obs_meta.flagged_terms)
    meta.flagged_terms = flagged
    add_history("Portfolio summary generated", headline)
    return PortfolioSummaryResponse(headline=headline, observations=observations, compliance=meta)
