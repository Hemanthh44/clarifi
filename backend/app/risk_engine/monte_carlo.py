"""Monte Carlo stochastic wealth & portfolio risk engine.

Simulates 1,000 independent Geometric Brownian Motion (GBM) market trajectories
incorporating asset covariance, drift, volatility, monthly systematic investment plans (SIP),
and institutional risk measures (VaR 95%, CVaR, Goal Probability, Sharpe Ratio).
"""
from __future__ import annotations

import numpy as np

# Asset class parameters: Annualized Mean Returns (mu) and Volatilities (sigma)
ASSET_PARAMS = {
    "Equity": {"mu": 0.120, "sigma": 0.180},
    "Debt": {"mu": 0.070, "sigma": 0.050},
    "Others": {"mu": 0.085, "sigma": 0.110},
}

# Empirical correlation matrix: [Equity, Debt, Others]
CORRELATION_MATRIX = np.array([
    [1.00, -0.15,  0.30],
    [-0.15, 1.00,  0.10],
    [0.30,  0.10,  1.00],
])

RISK_FREE_RATE = 0.065  # 6.5% RBI repo rate benchmark


def compute_portfolio_moments(equity_pct: float, debt_pct: float, others_pct: float) -> tuple[float, float]:
    """Calculates portfolio drift (mu_p) and annualized volatility (sigma_p) using
    the analytical covariance matrix."""
    w = np.array([equity_pct, debt_pct, others_pct], dtype=float) / 100.0
    mus = np.array([ASSET_PARAMS["Equity"]["mu"], ASSET_PARAMS["Debt"]["mu"], ASSET_PARAMS["Others"]["mu"]])
    sigmas = np.array([ASSET_PARAMS["Equity"]["sigma"], ASSET_PARAMS["Debt"]["sigma"], ASSET_PARAMS["Others"]["sigma"]])

    # Portfolio drift (weighted return)
    mu_p = float(np.dot(w, mus))

    # Covariance matrix: Sigma_ij = rho_ij * sigma_i * sigma_j
    D = np.diag(sigmas)
    cov_matrix = D @ CORRELATION_MATRIX @ D
    var_p = float(w.T @ cov_matrix @ w)
    sigma_p = float(np.sqrt(max(1e-6, var_p)))

    return mu_p, sigma_p


def run_monte_carlo(
    starting_value: float,
    equity_pct: float,
    debt_pct: float,
    others_pct: float,
    horizon_years: int = 10,
    monthly_sip: float = 0.0,
    target_goal: float = 0.0,
    num_simulations: int = 1000,
    random_seed: int = 42,
) -> dict:
    """Simulates multi-year portfolio evolution using monthly stochastic increments.

    Formula (Geometric Brownian Motion with monthly cashflow additions):
    S_{t+dt} = (S_t + SIP) * exp((mu - 0.5 * sigma^2)*dt + sigma * sqrt(dt) * Z)
    where Z ~ N(0, 1), dt = 1/12
    """
    horizon_years = max(1, min(30, int(horizon_years)))
    starting_value = max(100.0, float(starting_value))
    monthly_sip = max(0.0, float(monthly_sip))
    total = equity_pct + debt_pct + others_pct
    if total <= 0:
        equity_pct, debt_pct, others_pct = 50.0, 40.0, 10.0
    else:
        equity_pct = (equity_pct / total) * 100.0
        debt_pct = (debt_pct / total) * 100.0
        others_pct = (others_pct / total) * 100.0

    mu_p, sigma_p = compute_portfolio_moments(equity_pct, debt_pct, others_pct)

    rng = np.random.default_rng(random_seed)
    n_months = horizon_years * 12
    dt = 1.0 / 12.0
    drift_dt = (mu_p - 0.5 * (sigma_p ** 2)) * dt
    diffusion_std = sigma_p * np.sqrt(dt)

    # Initialize paths: shape (num_simulations, n_months + 1)
    paths = np.zeros((num_simulations, n_months + 1))
    paths[:, 0] = starting_value

    for m in range(1, n_months + 1):
        prev = paths[:, m - 1] + monthly_sip
        z = rng.standard_normal(num_simulations)
        growth = np.exp(drift_dt + diffusion_std * z)
        paths[:, m] = prev * growth

    # Extract yearly percentiles
    timeline = []
    for y in range(0, horizon_years + 1):
        m_idx = y * 12
        vals = paths[:, m_idx]
        timeline.append({
            "year": y,
            "p10": round(float(np.percentile(vals, 10)), 0),
            "p25": round(float(np.percentile(vals, 25)), 0),
            "p50": round(float(np.percentile(vals, 50)), 0),
            "p75": round(float(np.percentile(vals, 75)), 0),
            "p90": round(float(np.percentile(vals, 90)), 0),
        })

    terminal_values = paths[:, -1]
    total_invested = starting_value + (monthly_sip * n_months)

    # Probability of meeting the financial goal
    goal_target = target_goal if target_goal > 0 else (starting_value * 2.0)
    goal_prob = float(np.mean(terminal_values >= goal_target))

    # 1-Year Value at Risk (VaR 95%)
    one_year_values = paths[:, min(12, n_months)]
    one_year_returns = (one_year_values - (starting_value + monthly_sip * 12)) / starting_value
    var_95 = float(-np.percentile(one_year_returns, 5))  # loss at 5th percentile
    cvar_95 = float(-np.mean(one_year_returns[one_year_returns <= np.percentile(one_year_returns, 5)]))

    # Sharpe ratio
    sharpe_ratio = round((mu_p - RISK_FREE_RATE) / max(1e-4, sigma_p), 2)

    return {
        "horizon_years": horizon_years,
        "starting_value": starting_value,
        "monthly_sip": monthly_sip,
        "total_invested": round(total_invested, 0),
        "target_goal": round(goal_target, 0),
        "expected_annual_return": round(mu_p * 100, 2),
        "annual_volatility": round(sigma_p * 100, 2),
        "sharpe_ratio": sharpe_ratio,
        "terminal_metrics": {
            "p10_bearish": timeline[-1]["p10"],
            "p50_median": timeline[-1]["p50"],
            "p90_bullish": timeline[-1]["p90"],
            "goal_success_probability": round(goal_prob * 100, 1),
            "one_year_var_95": round(max(0.0, var_95) * 100, 1),
            "one_year_cvar_95": round(max(0.0, cvar_95) * 100, 1),
        },
        "timeline": timeline,
        "parameters": {
            "num_simulations": num_simulations,
            "stochastic_process": "Geometric Brownian Motion (GBM) with monthly Ito drift correction",
            "correlation_applied": True,
        },
    }
