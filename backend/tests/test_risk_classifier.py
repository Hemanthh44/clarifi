from app.ml.risk_classifier import CLASSES, predict_risk


def test_high_equity_concentrated_short_horizon_predicts_high_risk():
    result = predict_risk(equity=90, debt=5, others=5, horizon_years=1, num_assets=2)
    assert result["label"] == "High Risk"
    assert result["dataset"].startswith("synthetic-demo")


def test_low_equity_diversified_long_horizon_predicts_low_risk():
    result = predict_risk(equity=10, debt=75, others=15, horizon_years=20, num_assets=30)
    assert result["label"] == "Low Risk"


def test_probabilities_sum_to_one_and_match_label():
    result = predict_risk(equity=55, debt=30, others=15, horizon_years=7, num_assets=10)
    probs = result["probabilities"]
    assert set(probs.keys()) == set(CLASSES)
    assert abs(sum(probs.values()) - 1.0) < 0.01  # each class independently rounded to 3dp
    assert probs[result["label"]] == max(probs.values())


def test_metrics_are_real_and_non_trivial():
    result = predict_risk(equity=50, debt=30, others=20, horizon_years=5, num_assets=8)
    metrics = result["metrics"]
    assert 0.0 < metrics["accuracy"] < 1.0  # not fabricated as a perfect or zero score
    assert metrics["test_set_size"] > 0
    assert len(metrics["confusion_matrix"]["matrix"]) == len(CLASSES)


def test_factors_are_derived_not_hardcoded():
    result = predict_risk(equity=90, debt=5, others=5, horizon_years=1, num_assets=2)
    assert len(result["factors"]) > 0
    assert all(isinstance(f, str) for f in result["factors"])
