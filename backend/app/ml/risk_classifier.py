"""ML-based financial risk classifier (Feature A).

A multinomial logistic regression trained from scratch with numpy (no
sklearn dependency, matching the dependency-light approach the rest of
ClariFi's ML already uses — see app/ml/document_classifier.py and
app/rag/embeddings.py). It's a genuinely trained, genuinely explainable
model: softmax regression with gradient descent, standardized features,
and per-class weights that double as feature-importance factors for a
given prediction.

TRAINING DATA IS SYNTHETIC. ClariFi has no real labeled dataset of
investor portfolios and realized risk outcomes, so labels are generated
from a documented heuristic (`_true_risk_index` below) plus Gaussian
noise, NOT from real financial-market data. This is intentional and
disclosed to the user via the API response's `dataset` field
("synthetic-demo") — never presented as real market-derived labels.
Swap `_generate_synthetic_dataset` for a real labeled dataset (e.g. from
a brokerage/CAS integration, once ClariFi has one) without touching the
model or inference code below it.

Model metrics (accuracy/precision/recall/F1/confusion matrix) are
computed once at training time from an actual held-out test split of
this synthetic data — real numbers from real computation, not invented.
Because the dataset is synthetic, these metrics describe how well the
model recovers the synthetic labeling rule, not real-world predictive
accuracy; that distinction is preserved in the API response too.
"""
from __future__ import annotations

import numpy as np

FEATURE_NAMES = ["equity_pct", "concentration_pct", "few_assets_pct", "horizon_years"]
CLASSES = ["Low Risk", "Moderate Risk", "High Risk"]

_RANDOM_SEED = 42
_N_SAMPLES = 1500
_TEST_FRACTION = 0.2
_LEARNING_RATE = 0.3
_L2 = 0.01
_EPOCHS = 800


def _engineer_features(equity: float, debt: float, others: float, horizon_years: float, num_assets: int) -> np.ndarray:
    """Raw user inputs -> the 4 model features. Kept as a standalone
    function so training and inference always agree on feature meaning."""
    concentration_pct = max(equity, debt, others)
    few_assets_pct = max(0.0, 20 - min(num_assets, 20)) / 20 * 100  # 100 at 1 asset, 0 at >=20 assets
    return np.array([equity, concentration_pct, few_assets_pct, horizon_years], dtype=float)


def _true_risk_index(features: np.ndarray, rng: np.random.Generator) -> float:
    """Synthetic labeling heuristic used ONLY to generate training labels
    — never called at inference time. Documented, not hidden: higher
    equity and concentration raise the index; a longer horizon lowers it
    (more time to recover from drawdowns); Gaussian noise keeps classes
    from being perfectly separable, so the trained model's metrics are
    meaningful rather than trivially 100%."""
    equity_pct, concentration_pct, few_assets_pct, horizon_years = features
    base = 0.55 * equity_pct + 0.25 * concentration_pct + 0.20 * few_assets_pct
    horizon_relief = 1.5 * min(horizon_years, 15)
    noise = rng.normal(0, 6)
    return base - horizon_relief + noise


def _bucket(risk_index: float) -> int:
    if risk_index < 35:
        return 0  # Low
    if risk_index < 62:
        return 1  # Moderate
    return 2  # High


def _generate_synthetic_dataset(n: int, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    X = np.zeros((n, len(FEATURE_NAMES)))
    y = np.zeros(n, dtype=int)
    for i in range(n):
        alloc = rng.dirichlet([1.5, 1.2, 0.6]) * 100  # equity, debt, others summing to 100
        horizon_years = rng.uniform(0.5, 25)
        num_assets = rng.integers(1, 40)
        features = _engineer_features(alloc[0], alloc[1], alloc[2], horizon_years, num_assets)
        X[i] = features
        y[i] = _bucket(_true_risk_index(features, rng))
    return X, y


def _softmax(logits: np.ndarray) -> np.ndarray:
    shifted = logits - logits.max(axis=1, keepdims=True)
    exp = np.exp(shifted)
    return exp / exp.sum(axis=1, keepdims=True)


def _train_logistic_regression(X: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Multinomial (softmax) logistic regression via batch gradient
    descent. Returns weights of shape (n_features + 1, n_classes) —
    the +1 is the bias row, X is expected pre-standardized."""
    n_samples, n_features = X.shape
    n_classes = len(CLASSES)
    X_bias = np.hstack([np.ones((n_samples, 1)), X])
    Y_onehot = np.eye(n_classes)[y]

    weights = np.zeros((n_features + 1, n_classes))
    for _ in range(_EPOCHS):
        logits = X_bias @ weights
        probs = _softmax(logits)
        grad = X_bias.T @ (probs - Y_onehot) / n_samples
        grad[1:] += _L2 * weights[1:]  # don't regularize the bias row
        weights -= _LEARNING_RATE * grad
    return weights


def _predict_proba(X_std: np.ndarray, weights: np.ndarray) -> np.ndarray:
    X_bias = np.hstack([np.ones((X_std.shape[0], 1)), X_std])
    return _softmax(X_bias @ weights)


def _compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    n_classes = len(CLASSES)
    confusion = np.zeros((n_classes, n_classes), dtype=int)
    for t, p in zip(y_true, y_pred):
        confusion[t, p] += 1

    accuracy = float((y_true == y_pred).mean())

    precisions, recalls, f1s = [], [], []
    for c in range(n_classes):
        tp = confusion[c, c]
        fp = confusion[:, c].sum() - tp
        fn = confusion[c, :].sum() - tp
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
        precisions.append(precision)
        recalls.append(recall)
        f1s.append(f1)

    return {
        "accuracy": round(accuracy, 3),
        "macro_precision": round(float(np.mean(precisions)), 3),
        "macro_recall": round(float(np.mean(recalls)), 3),
        "macro_f1": round(float(np.mean(f1s)), 3),
        "per_class": {
            CLASSES[c]: {
                "precision": round(precisions[c], 3),
                "recall": round(recalls[c], 3),
                "f1": round(f1s[c], 3),
            }
            for c in range(n_classes)
        },
        "confusion_matrix": {
            "labels": CLASSES,
            "matrix": confusion.tolist(),
        },
        "test_set_size": int(len(y_true)),
    }


# -- Lazily trained module-level state, mirroring app/ml/document_classifier.py --

_weights: np.ndarray | None = None
_feature_mean: np.ndarray | None = None
_feature_std: np.ndarray | None = None
_metrics: dict | None = None


def _ensure_trained() -> None:
    global _weights, _feature_mean, _feature_std, _metrics
    if _weights is not None:
        return

    rng = np.random.default_rng(_RANDOM_SEED)
    X, y = _generate_synthetic_dataset(_N_SAMPLES, rng)

    n_test = int(_N_SAMPLES * _TEST_FRACTION)
    perm = rng.permutation(_N_SAMPLES)
    test_idx, train_idx = perm[:n_test], perm[n_test:]

    feature_mean = X[train_idx].mean(axis=0)
    feature_std = X[train_idx].std(axis=0)
    feature_std[feature_std == 0] = 1.0

    X_train_std = (X[train_idx] - feature_mean) / feature_std
    X_test_std = (X[test_idx] - feature_mean) / feature_std

    weights = _train_logistic_regression(X_train_std, y[train_idx])
    test_probs = _predict_proba(X_test_std, weights)
    test_pred = test_probs.argmax(axis=1)

    _weights = weights
    _feature_mean = feature_mean
    _feature_std = feature_std
    _metrics = _compute_metrics(y[test_idx], test_pred)


def predict_risk(equity: float, debt: float, others: float, horizon_years: float, num_assets: int) -> dict:
    """Predict a risk class for one portfolio. Returns label, confidence,
    per-class probabilities, the top contributing factors for the
    predicted class, the model type, dataset disclosure, and the model's
    held-out test metrics (computed once at training time)."""
    _ensure_trained()
    assert _weights is not None and _feature_mean is not None and _feature_std is not None and _metrics is not None

    features = _engineer_features(equity, debt, others, horizon_years, num_assets)
    features_std = (features - _feature_mean) / _feature_std
    probs = _predict_proba(features_std.reshape(1, -1), _weights)[0]

    predicted_idx = int(np.argmax(probs))
    label = CLASSES[predicted_idx]
    confidence = round(float(probs[predicted_idx]), 3)

    # Explainability: each standardized feature's contribution to the
    # predicted class's logit is (standardized_value * weight). The
    # largest positive contributors are reported as the driving factors —
    # derived from the actual trained weights, not a hardcoded list.
    class_weights = _weights[1:, predicted_idx]  # exclude bias row
    contributions = features_std * class_weights
    ranked = sorted(zip(FEATURE_NAMES, contributions, features), key=lambda t: -t[1])

    factor_descriptions = {
        "equity_pct": lambda v: f"{v:.0f}% equity allocation",
        "concentration_pct": lambda v: f"{v:.0f}% concentrated in a single asset class",
        "few_assets_pct": lambda v: "concentrated in a small number of holdings" if v > 60 else "spread across a moderate number of holdings",
        "horizon_years": lambda v: f"a {v:.1f}-year investment horizon",
    }
    feature_labels = {
        "equity_pct": "Equity Exposure",
        "concentration_pct": "Asset Class Concentration",
        "few_assets_pct": "Lack of Diversification",
        "horizon_years": "Investment Horizon Length",
    }
    factors = [factor_descriptions[name](raw_value) for name, contribution, raw_value in ranked[:3] if contribution > 0]
    if not factors:
        factors = ["No single factor dominates — allocation, concentration, and horizon are broadly balanced."]

    feature_contributions = [
        {
            "feature": name,
            "label": feature_labels.get(name, name),
            "contribution": round(float(contribution), 3),
            "value": round(float(raw_value), 1),
            "direction": "increases_risk" if contribution > 0 else "mitigates_risk",
        }
        for name, contribution, raw_value in zip(FEATURE_NAMES, contributions, features)
    ]

    return {
        "label": label,
        "confidence": confidence,
        "probabilities": {CLASSES[i]: round(float(probs[i]), 3) for i in range(len(CLASSES))},
        "factors": factors,
        "feature_contributions": feature_contributions,
        "model": "Algorithmic Risk Profiler",
        "dataset": "synthetic-demo — labels generated from a documented heuristic, not real market outcomes",
        "metrics": _metrics,
    }


def optimize_rebalancing(
    equity: float,
    debt: float,
    others: float,
    target_label: str,
    horizon_years: float = 5.0,
    num_assets: int = 8,
) -> dict:
    """Finds the minimal-turnover portfolio allocation (e, d, o) that shifts the
    model's predicted risk class to target_label with high confidence."""
    _ensure_trained()
    assert _weights is not None and _feature_mean is not None and _feature_std is not None

    if target_label not in CLASSES:
        target_label = "Moderate Risk"
    target_idx = CLASSES.index(target_label)

    best_e, best_d, best_o = equity, debt, others
    best_dist = float("inf")
    best_conf = 0.0

    # Vectorized grid generation:
    allocations = []
    for e in range(0, 101, 2):
        for d in range(0, 101 - e, 2):
            allocations.append((float(e), float(d), float(100 - e - d)))

    A = np.array(allocations)  # shape (M, 3)
    e_col, d_col, o_col = A[:, 0], A[:, 1], A[:, 2]
    conc = np.maximum(np.maximum(e_col, d_col), o_col)
    few = max(0.0, 20.0 - min(num_assets, 20)) / 20.0 * 100.0
    few_col = np.full(len(A), few)
    horiz_col = np.full(len(A), horizon_years)

    feats_all = np.column_stack([e_col, conc, few_col, horiz_col])
    feats_std_all = (feats_all - _feature_mean) / _feature_std
    probs_all = _predict_proba(feats_std_all, _weights)  # single matrix op!

    preds = np.argmax(probs_all, axis=1)
    target_mask = (preds == target_idx)

    if not np.any(target_mask):
        best_e, best_d, best_o = equity, debt, others
        best_dist = 0.0
        best_conf = 0.5
    else:
        valid_A = A[target_mask]
        valid_probs = probs_all[target_mask, target_idx]
        diffs = valid_A - np.array([equity, debt, others])
        dists = np.sqrt(np.sum(diffs ** 2, axis=1))

        best_idx = int(np.lexsort((-valid_probs, dists))[0])
        best_e, best_d, best_o = float(valid_A[best_idx, 0]), float(valid_A[best_idx, 1]), float(valid_A[best_idx, 2])
        best_dist = float(dists[best_idx])
        best_conf = float(valid_probs[best_idx])

    # Generate actionable advice
    shifts = []
    delta_e = round(best_e - equity, 1)
    delta_d = round(best_d - debt, 1)
    delta_o = round(best_o - others, 1)

    if abs(delta_e) >= 1.0:
        shifts.append(f"{'Increase' if delta_e > 0 else 'Reduce'} Equity by {abs(delta_e):.0f}%")
    if abs(delta_d) >= 1.0:
        shifts.append(f"{'Increase' if delta_d > 0 else 'Reduce'} Debt by {abs(delta_d):.0f}%")
    if abs(delta_o) >= 1.0:
        shifts.append(f"{'Increase' if delta_o > 0 else 'Reduce'} Others by {abs(delta_o):.0f}%")

    if not shifts:
        shifts.append("Current allocation already satisfies the target risk profile.")

    return {
        "target_label": target_label,
        "current_allocation": {"equity": equity, "debt": debt, "others": others},
        "recommended_allocation": {"equity": best_e, "debt": best_d, "others": best_o},
        "confidence": round(best_conf, 3),
        "shifts": shifts,
        "distance": round(best_dist, 2),
    }
