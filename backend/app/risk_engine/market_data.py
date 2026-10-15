"""Historical market-shock reference data used by the deterministic
risk engine. These are fixed educational shock assumptions for the simulator
engine — not a certified backtest data source. In production this
module would be replaced by a real historical-returns dataset (e.g.
NSE/BSE index series) feeding the same interface.
"""

MARKET_SHOCKS = {
    "gfc-2008": {
        "id": "gfc-2008",
        "name": "2008 Global Financial Crisis",
        "character": "global credit crisis that triggered a sharp, sustained equity sell-off",
        "period": "Sep 2008 – Mar 2009",
        # Peak-to-trough return impact by asset class, applied to the user's asset mix.
        "asset_shock_pct": {"Equity": -38.2, "Debt": -4.1, "Others": -9.6},
        "drawdown_pct": -34.1,
        "recovery_months": 19,
        "risk_score_change": 14,
    },
    "covid-2020": {
        "id": "covid-2020",
        "name": "2020 COVID Crash",
        "character": "fast, sharp shock followed by an unusually quick recovery",
        "period": "Feb 2020 – Apr 2020",
        "asset_shock_pct": {"Equity": -32.7, "Debt": -2.3, "Others": -6.8},
        "drawdown_pct": -29.4,
        "recovery_months": 5,
        "risk_score_change": 9,
    },
    "taper-2013": {
        "id": "taper-2013",
        "name": "2013 Taper Tantrum",
        "character": "currency and rate-driven shock with a milder equity impact",
        "period": "May 2013 – Aug 2013",
        "asset_shock_pct": {"Equity": -12.9, "Debt": -3.8, "Others": -2.1},
        "drawdown_pct": -11.2,
        "recovery_months": 3,
        "risk_score_change": 5,
    },
}
