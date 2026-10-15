from app.risk_engine.risk_score import compute_risk_score
from app.risk_engine.stress_test import run_stress_test


def test_risk_score_is_stable_for_a_user_allocation():
    asset_mix = [
        {"label": "Equity", "value": 62},
        {"label": "Debt", "value": 28},
        {"label": "Others", "value": 10},
    ]
    result = compute_risk_score(asset_mix)
    assert result["score"] == 62
    assert result["label"] == "Moderate"
    assert len(result["breakdown"]) == 3


def test_all_debt_portfolio_scores_lower_than_all_equity():
    all_debt = [{"label": "Debt", "value": 100}]
    all_equity = [{"label": "Equity", "value": 100}]
    assert compute_risk_score(all_debt)["score"] < compute_risk_score(all_equity)["score"]


def test_stress_test_is_deterministic():
    asset_mix = [{"label": "Equity", "value": 62}, {"label": "Debt", "value": 28}, {"label": "Others", "value": 10}]
    r1 = run_stress_test("gfc-2008", 500000, asset_mix)
    r2 = run_stress_test("gfc-2008", 500000, asset_mix)
    assert r1 == r2
    assert r1["impact_value"] < r1["starting_value"]
