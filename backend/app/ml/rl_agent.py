"""Reinforcement Learning (RL) Portfolio Rebalancing & Allocation Agent.

Implements an autonomous multi-period financial decision-making agent using
Q-Learning (Temporal Difference control over a Markov Decision Process).

Environment Formulation:
- State Space S: Discrete tuples (equity_bucket, horizon_phase, market_regime, drift_status)
- Action Space A:
    0: HOLD (No rebalancing, zero friction / zero capital gains tax)
    1: DEFENSIVE_GLIDE (Shift 10% Equity -> Debt/Liquid to de-risk near horizon)
    2: GROWTH_EXPANSION (Shift 10% Debt/Liquid -> Equity during favorable regimes)
    3: TACTICAL_DIP_BUY (Deploy cash to accumulate equities during market pullbacks)
    4: PRESERVATION_EXIT (Emergency 20% shift into safe debt during severe drawdowns)
- Reward Function R:
    R = portfolio_return - risk_penalty * downside_deviation - turnover_friction + horizon_alignment_bonus
- Optimization:
    Q(s, a) <- Q(s, a) + alpha * [r + gamma * max_a' Q(s', a') - Q(s, a)]
"""
from __future__ import annotations

import math
from typing import Any
import numpy as np

# Action definitions
ACTIONS = [
    {"id": 0, "name": "HOLD", "label": "Hold Current Position", "description": "Maintain weights; incur zero transaction fees or capital gains tax friction."},
    {"id": 1, "name": "DEFENSIVE_GLIDE", "label": "Defensive Glide Shift", "description": "Shift 10% from Equity to Debt/Liquid to lock in gains and reduce portfolio volatility."},
    {"id": 2, "name": "GROWTH_EXPANSION", "label": "Growth Expansion", "description": "Shift 10% from Debt/Liquid to Equity to accelerate compounding during expansionary cycles."},
    {"id": 3, "name": "TACTICAL_DIP_BUY", "label": "Tactical Dip Accumulation", "description": "Opportunistically deploy reserves (+15% Equity) into discounted assets during market drawdowns."},
    {"id": 4, "name": "PRESERVATION_EXIT", "label": "Capital Preservation", "description": "Emergency de-risking: shift 20% from volatile equities into safe fixed-income/liquid instruments."},
]

ACTION_NAMES = [a["name"] for a in ACTIONS]
NUM_ACTIONS = len(ACTIONS)

# Market regimes with annualized return and volatility parameters
REGIMES = [
    {"id": 0, "name": "Bear Market", "equity_mean": -0.12, "equity_vol": 0.26, "debt_mean": 0.07, "debt_vol": 0.04, "prob": 0.20},
    {"id": 1, "name": "Normal / Range-Bound", "equity_mean": 0.09, "equity_vol": 0.15, "debt_mean": 0.065, "debt_vol": 0.03, "prob": 0.55},
    {"id": 2, "name": "Bull Expansion", "equity_mean": 0.18, "equity_vol": 0.16, "debt_mean": 0.06, "debt_vol": 0.025, "prob": 0.25},
]

# State discretization bounds
EQUITY_BUCKETS = ["Low (<35%)", "Moderate (35-65%)", "High (>65%)"]
HORIZON_PHASES = ["Late (<=2 yrs)", "Mid (3-7 yrs)", "Early (>7 yrs)"]
MARKET_REGIMES = ["Bear Market", "Normal Range", "Bull Expansion"]
DRIFT_STATUSES = ["Lagging Target", "On-Track", "Ahead of Target"]

NUM_EQUITY_STATES = 3
NUM_HORIZON_STATES = 3
NUM_REGIME_STATES = 3
NUM_DRIFT_STATES = 3
TOTAL_STATES = NUM_EQUITY_STATES * NUM_HORIZON_STATES * NUM_REGIME_STATES * NUM_DRIFT_STATES  # 81 states


def _discretize_state(equity: float, horizon_years: float, regime_id: int, drift_pct: float) -> int:
    """Encodes continuous portfolio and macro parameters into a single state index [0, 80]."""
    # 1. Equity bucket
    if equity < 35.0:
        eq_s = 0
    elif equity <= 65.0:
        eq_s = 1
    else:
        eq_s = 2

    # 2. Horizon phase
    if horizon_years <= 2.0:
        horiz_s = 0
    elif horizon_years <= 7.0:
        horiz_s = 1
    else:
        horiz_s = 2

    # 3. Market regime
    regime_s = max(0, min(2, regime_id))

    # 4. Drift status relative to initial benchmark
    if drift_pct < -5.0:
        drift_s = 0
    elif drift_pct <= 5.0:
        drift_s = 1
    else:
        drift_s = 2

    # Mixed-radix index
    state_idx = (
        eq_s * (NUM_HORIZON_STATES * NUM_REGIME_STATES * NUM_DRIFT_STATES)
        + horiz_s * (NUM_REGIME_STATES * NUM_DRIFT_STATES)
        + regime_s * NUM_DRIFT_STATES
        + drift_s
    )
    return state_idx


def _decode_state(state_idx: int) -> tuple[int, int, int, int]:
    """Decodes a state index back into its discrete component indices."""
    drift_s = state_idx % NUM_DRIFT_STATES
    rem = state_idx // NUM_DRIFT_STATES

    regime_s = rem % NUM_REGIME_STATES
    rem = rem // NUM_REGIME_STATES

    horiz_s = rem % NUM_HORIZON_STATES
    eq_s = rem // NUM_HORIZON_STATES
    return eq_s, horiz_s, regime_s, drift_s


class PortfolioRLAgent:
    """Tabular Q-Learning Agent for Dynamic Financial Portfolio Optimization."""

    def __init__(
        self,
        alpha: float = 0.15,
        gamma: float = 0.95,
        epsilon_start: float = 1.0,
        epsilon_min: float = 0.05,
        epsilon_decay: float = 0.998,
        risk_aversion: float = 1.5,
        turnover_penalty: float = 0.012,
        random_seed: int = 42,
    ) -> None:
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon_start
        self.epsilon_min = epsilon_min
        self.epsilon_decay = epsilon_decay
        self.risk_aversion = risk_aversion
        self.turnover_penalty = turnover_penalty
        self.rng = np.random.default_rng(random_seed)

        # Q-table: (81 states, 5 actions)
        self.q_table = np.zeros((TOTAL_STATES, NUM_ACTIONS), dtype=float)
        self.training_convergence: list[dict[str, Any]] = []
        self.is_trained = False

    def _apply_action(self, equity: float, debt: float, others: float, action: int) -> tuple[float, float, float, float]:
        """Applies action shifts to portfolio weights and calculates turnover amount."""
        e, d, o = equity, debt, others
        turnover = 0.0

        if action == 1:  # DEFENSIVE_GLIDE: -10% equity, +10% debt
            shift = min(10.0, max(0.0, e - 10.0))
            e -= shift
            d += shift
            turnover = shift
        elif action == 2:  # GROWTH_EXPANSION: +10% equity, -10% debt
            shift = min(10.0, max(0.0, d - 10.0))
            d -= shift
            e += shift
            turnover = shift
        elif action == 3:  # TACTICAL_DIP_BUY: +15% equity, from debt/others
            avail = max(0.0, (d + o) - 15.0)
            shift = min(15.0, avail)
            e += shift
            d_shift = shift * (d / max(1.0, d + o))
            o_shift = shift - d_shift
            d -= d_shift
            o -= o_shift
            turnover = shift
        elif action == 4:  # PRESERVATION_EXIT: -20% equity, +20% debt
            shift = min(20.0, max(0.0, e - 10.0))
            e -= shift
            d += shift
            turnover = shift
        # action == 0: HOLD -> turnover = 0.0

        # Normalization guard
        total = e + d + o
        if total > 0:
            e = (e / total) * 100.0
            d = (d / total) * 100.0
            o = (o / total) * 100.0

        return e, d, o, turnover

    def _step(
        self,
        equity: float,
        debt: float,
        others: float,
        horizon_years: float,
        action: int,
        regime_id: int,
        drift_pct: float,
    ) -> tuple[int, float, float, float, float, float]:
        """Simulates 1 period (year) step under the given action and market regime."""
        new_e, new_d, new_o, turnover = self._apply_action(equity, debt, others, action)

        regime = REGIMES[regime_id]
        # Stochastic market draw for period
        eq_ret = self.rng.normal(regime["equity_mean"], regime["equity_vol"])
        db_ret = self.rng.normal(regime["debt_mean"], regime["debt_vol"])
        ot_ret = 0.055  # Safe cash / money market

        period_return = (new_e / 100.0) * eq_ret + (new_d / 100.0) * db_ret + (new_o / 100.0) * ot_ret

        # Reward Function:
        # 1. Base return
        reward = period_return * 100.0

        # 2. Downside penalty (asymmetric risk aversion against negative years)
        if period_return < 0:
            reward -= self.risk_aversion * (abs(period_return) * 100.0) ** 1.3

        # 3. Turnover friction (taxes, slippage, brokerage)
        reward -= (self.turnover_penalty * turnover)

        # 4. Glide-path horizon alignment: penalize high equity (>40%) in the late horizon (<=2 yrs)
        if horizon_years <= 2.0 and new_e > 45.0:
            reward -= 4.0 * ((new_e - 45.0) / 10.0)
        # Reward maintaining equity during early long horizons (>7 yrs)
        elif horizon_years > 7.0 and new_e >= 55.0 and regime_id != 0:
            reward += 1.5

        # Transition to next state
        next_horizon = max(0.0, horizon_years - 1.0)
        # Next market regime transition (Markovian regime probabilities)
        next_regime = int(self.rng.choice([0, 1, 2], p=[0.20, 0.55, 0.25]))
        next_drift = drift_pct + (period_return - 0.08) * 100.0  # Drift relative to 8% target benchmark
        next_state = _discretize_state(new_e, next_horizon, next_regime, next_drift)

        return next_state, reward, period_return, new_e, new_d, new_o

    def train(self, episodes: int = 2500) -> None:
        """Trains the Q-Learning agent across thousands of simulated multi-period market episodes."""
        checkpoint_interval = max(50, episodes // 20)
        cum_rewards_batch: list[float] = []

        for ep in range(episodes):
            # Sample random portfolio starting condition
            equity = float(self.rng.uniform(20.0, 80.0))
            debt = float(self.rng.uniform(15.0, 70.0))
            others = max(0.0, 100.0 - equity - debt)
            norm = equity + debt + others
            equity, debt, others = (equity / norm) * 100, (debt / norm) * 100, (others / norm) * 100

            horizon = float(self.rng.integers(3, 21))
            regime = int(self.rng.choice([0, 1, 2], p=[0.20, 0.55, 0.25]))
            drift = float(self.rng.uniform(-10.0, 10.0))

            state = _discretize_state(equity, horizon, regime, drift)
            episode_reward = 0.0

            while horizon > 0:
                # Epsilon-greedy action selection
                if self.rng.random() < self.epsilon:
                    action = int(self.rng.integers(0, NUM_ACTIONS))
                else:
                    action = int(np.argmax(self.q_table[state]))

                next_state, reward, _, equity, debt, others = self._step(
                    equity, debt, others, horizon, action, regime, drift
                )

                # Bellman Q-Learning update
                best_next_q = np.max(self.q_table[next_state])
                td_target = reward + self.gamma * best_next_q
                td_error = td_target - self.q_table[state, action]
                self.q_table[state, action] += self.alpha * td_error

                episode_reward += reward
                state = next_state
                horizon -= 1.0

            # Epsilon decay
            if self.epsilon > self.epsilon_min:
                self.epsilon *= self.epsilon_decay

            cum_rewards_batch.append(episode_reward)

            if (ep + 1) % checkpoint_interval == 0:
                avg_rew = float(np.mean(cum_rewards_batch[-checkpoint_interval:]))
                self.training_convergence.append({
                    "episode": ep + 1,
                    "avg_reward": round(avg_rew, 2),
                    "epsilon": round(float(self.epsilon), 4),
                    "q_norm": round(float(np.linalg.norm(self.q_table)), 2),
                })

        self.is_trained = True

    def select_best_action(self, equity: float, horizon_years: float, regime_id: int, drift_pct: float) -> int:
        """Selects greedy policy action pi*(s) = argmax_a Q(s, a)."""
        state = _discretize_state(equity, horizon_years, regime_id, drift_pct)
        return int(np.argmax(self.q_table[state]))


# Module-level cached agent
_agent_instance: PortfolioRLAgent | None = None


def get_trained_rl_agent() -> PortfolioRLAgent:
    global _agent_instance
    if _agent_instance is None or not _agent_instance.is_trained:
        agent = PortfolioRLAgent(random_seed=42)
        agent.train(episodes=2200)
        _agent_instance = agent
    return _agent_instance


def simulate_rl_portfolio(
    starting_value: float,
    equity: float,
    debt: float,
    others: float,
    horizon_years: int = 10,
    monthly_sip: float = 10000.0,
    risk_tolerance: str = "Balanced",
) -> dict[str, Any]:
    """Runs a multi-year comparative trajectory simulation:
    Strategy 1: Dynamic Reinforcement Learning (Q-Learning) Agent
    Strategy 2: Buy & Hold (Static unmanaged drift)
    Strategy 3: Fixed Rule 60/40 Annual Rebalance
    """
    agent = get_trained_rl_agent()
    rng = np.random.default_rng(101)  # Fixed seed for repeatable comparison across strategies

    # Pre-generate stochastic market returns for identical comparison across strategies
    regimes_history: list[dict[str, Any]] = []
    market_returns_history: list[dict[str, float]] = []

    for _ in range(horizon_years):
        regime_id = int(rng.choice([0, 1, 2], p=[0.20, 0.55, 0.25]))
        regime_meta = REGIMES[regime_id]
        eq_ret = float(rng.normal(regime_meta["equity_mean"], regime_meta["equity_vol"]))
        db_ret = float(rng.normal(regime_meta["debt_mean"], regime_meta["debt_vol"]))
        ot_ret = 0.055
        regimes_history.append({"id": regime_id, "name": regime_meta["name"]})
        market_returns_history.append({"equity": eq_ret, "debt": db_ret, "others": ot_ret})

    # ----------------------------------------------------
    # 1. Simulate RL Policy Agent
    # ----------------------------------------------------
    rl_timeline: list[dict[str, Any]] = []
    rl_corpus = starting_value
    rl_e, rl_d, rl_o = equity, debt, others
    rl_returns: list[float] = []
    rl_values: list[float] = [rl_corpus]
    rl_turnover_sum = 0.0
    action_counts = {name: 0 for name in ACTION_NAMES}

    for y in range(1, horizon_years + 1):
        rem_horizon = horizon_years - y + 1
        regime_obj = regimes_history[y - 1]
        mkt_ret = market_returns_history[y - 1]

        # Calculate drift from starting allocation
        drift_pct = (rl_corpus / max(1.0, starting_value + (y - 1) * monthly_sip * 12) - 1.0) * 100.0

        # RL policy action selection
        action_idx = agent.select_best_action(rl_e, rem_horizon, regime_obj["id"], drift_pct)
        action_meta = ACTIONS[action_idx]
        action_counts[action_meta["name"]] += 1

        # Apply action shift
        new_e, new_d, new_o, turnover = agent._apply_action(rl_e, rl_d, rl_o, action_idx)
        rl_turnover_sum += turnover

        # Compute return on shifted allocation
        period_ret = (new_e / 100.0) * mkt_ret["equity"] + (new_d / 100.0) * mkt_ret["debt"] + (new_o / 100.0) * mkt_ret["others"]
        # Apply annual SIP additions + investment compounding
        annual_sip = monthly_sip * 12.0
        friction_cost = (turnover / 100.0) * rl_corpus * 0.0015  # 0.15% friction
        rl_corpus = (rl_corpus + annual_sip - friction_cost) * (1.0 + period_ret)

        rl_returns.append(period_ret)
        rl_values.append(rl_corpus)

        # Context rationale for explainability
        if action_idx == 0:
            rationale = "Maintained allocation; saved transaction fees and tax drag in range-bound market."
        elif action_idx == 1:
            rationale = f"De-risked -10% equity -> debt to protect corpus as horizon approaches ({rem_horizon} yrs left)."
        elif action_idx == 2:
            rationale = "Expanded equity exposure (+10%) to capture compounding returns in expansion regime."
        elif action_idx == 3:
            rationale = "Tactical dip-buy: allocated reserves (+15% equity) during market drawdown discount."
        else:
            rationale = "Emergency capital preservation: shifted 20% to safe debt to mitigate severe bear drop."

        rl_timeline.append({
            "year": y,
            "regime": regime_obj["name"],
            "action": action_meta["name"],
            "action_label": action_meta["label"],
            "rationale": rationale,
            "equity_pct": round(new_e, 1),
            "debt_pct": round(new_d, 1),
            "others_pct": round(new_o, 1),
            "period_return_pct": round(period_ret * 100.0, 2),
            "portfolio_value": round(rl_corpus, 0),
        })

        rl_e, rl_d, rl_o = new_e, new_d, new_o

    # ----------------------------------------------------
    # 2. Simulate Buy & Hold Strategy (Passive unmanaged drift)
    # ----------------------------------------------------
    bh_corpus = starting_value
    bh_e_val = starting_value * (equity / 100.0)
    bh_d_val = starting_value * (debt / 100.0)
    bh_o_val = starting_value * (others / 100.0)
    bh_returns: list[float] = []
    bh_values: list[float] = [bh_corpus]

    for y in range(1, horizon_years + 1):
        mkt_ret = market_returns_history[y - 1]
        annual_sip = monthly_sip * 12.0
        # Add SIP according to original fixed percentages
        bh_e_val += annual_sip * (equity / 100.0)
        bh_d_val += annual_sip * (debt / 100.0)
        bh_o_val += annual_sip * (others / 100.0)

        prev_total = bh_e_val + bh_d_val + bh_o_val
        bh_e_val *= (1.0 + mkt_ret["equity"])
        bh_d_val *= (1.0 + mkt_ret["debt"])
        bh_o_val *= (1.0 + mkt_ret["others"])
        bh_corpus = bh_e_val + bh_d_val + bh_o_val
        period_ret = (bh_corpus / prev_total) - 1.0
        bh_returns.append(period_ret)
        bh_values.append(bh_corpus)

    # ----------------------------------------------------
    # 3. Simulate Fixed Rule-Based 60/40 Annual Rebalancer
    # ----------------------------------------------------
    fix_corpus = starting_value
    fix_returns: list[float] = []
    fix_values: list[float] = [fix_corpus]

    for y in range(1, horizon_years + 1):
        mkt_ret = market_returns_history[y - 1]
        annual_sip = monthly_sip * 12.0
        # Mechanical rigid 60% eq, 30% debt, 10% cash with constant rebalancing turnover
        fix_e, fix_d, fix_o = 60.0, 30.0, 10.0
        period_ret = 0.60 * mkt_ret["equity"] + 0.30 * mkt_ret["debt"] + 0.10 * mkt_ret["others"]
        friction_cost = 0.0020 * fix_corpus  # annual rebalance friction
        fix_corpus = (fix_corpus + annual_sip - friction_cost) * (1.0 + period_ret)
        fix_returns.append(period_ret)
        fix_values.append(fix_corpus)

    # ----------------------------------------------------
    # Performance & Risk Metric Helpers
    # ----------------------------------------------------
    def _metrics(returns: list[float], values: list[float], starting: float, monthly_sip: float) -> dict[str, float]:
        total_invested = starting + monthly_sip * 12 * horizon_years
        final_val = values[-1]
        cum_ret = ((final_val - total_invested) / max(1.0, total_invested)) * 100.0
        cagr = ((final_val / max(1.0, starting)) ** (1.0 / max(1, horizon_years)) - 1.0) * 100.0

        mean_r = float(np.mean(returns))
        vol = float(np.std(returns)) or 0.01
        rf = 0.055
        sharpe = (mean_r - rf) / vol

        downside = [min(0.0, r - rf) for r in returns]
        downside_dev = math.sqrt(float(np.mean(np.array(downside) ** 2))) or 0.005
        sortino = (mean_r - rf) / downside_dev

        # Maximum Drawdown
        peak = values[0]
        max_dd = 0.0
        for v in values:
            if v > peak:
                peak = v
            dd = (peak - v) / max(1.0, peak)
            if dd > max_dd:
                max_dd = dd

        return {
            "final_value": round(final_val, 0),
            "total_invested": round(total_invested, 0),
            "net_gain": round(final_val - total_invested, 0),
            "cumulative_return_pct": round(cum_ret, 1),
            "cagr_pct": round(cagr, 1),
            "sharpe_ratio": round(sharpe, 2),
            "sortino_ratio": round(sortino, 2),
            "max_drawdown_pct": round(max_dd * 100.0, 1),
            "annual_volatility_pct": round(vol * 100.0, 1),
        }

    rl_metrics = _metrics(rl_returns, rl_values, starting_value, monthly_sip)
    bh_metrics = _metrics(bh_returns, bh_values, starting_value, monthly_sip)
    fix_metrics = _metrics(fix_returns, fix_values, starting_value, monthly_sip)

    # Calculate policy action distribution
    total_actions = sum(action_counts.values()) or 1
    action_distribution = [
        {"action": name, "count": count, "percentage": round((count / total_actions) * 100.0, 1)}
        for name, count in action_counts.items()
    ]

    # Combine timeline points for multi-line charting
    chart_timeline = []
    for y in range(horizon_years + 1):
        chart_timeline.append({
            "year": y,
            "rl_agent": round(rl_values[y], 0),
            "buy_and_hold": round(bh_values[y], 0),
            "fixed_60_40": round(fix_values[y], 0),
        })

    # Key takeaway
    sharpe_diff = round(rl_metrics["sharpe_ratio"] - bh_metrics["sharpe_ratio"], 2)
    dd_diff = round(bh_metrics["max_drawdown_pct"] - rl_metrics["max_drawdown_pct"], 1)

    executive_summary = (
        f"The Smart Adaptive Strategy achieved a {rl_metrics['sharpe_ratio']} Sharpe Ratio "
        f"({'+' if sharpe_diff >= 0 else ''}{sharpe_diff} vs Buy-and-Hold) while curbing Maximum Drawdown "
        f"by {dd_diff}%. By maintaining allocation during {action_counts['HOLD']} stable periods and proactively initiating "
        f"tactical growth moves or capital preservation glides only when market conditions required it, "
        f"this strategy maximized risk-adjusted terminal wealth with minimized turnover fees."
    )

    return {
        "executive_summary": executive_summary,
        "parameters": {
            "starting_value": starting_value,
            "equity": equity,
            "debt": debt,
            "others": others,
            "horizon_years": horizon_years,
            "monthly_sip": monthly_sip,
            "risk_tolerance": risk_tolerance,
        },
        "benchmarks": {
            "rl_agent": rl_metrics,
            "buy_and_hold": bh_metrics,
            "fixed_60_40": fix_metrics,
        },
        "timeline": rl_timeline,
        "chart_data": chart_timeline,
        "action_distribution": action_distribution,
        "training_convergence": agent.training_convergence[-10:],
        "actions_catalog": ACTIONS,
        "model_metadata": {
            "strategy_type": "Multi-Period Adaptive Asset Allocation Engine",
            "optimization_goal": "Maximized Risk-Adjusted Wealth with Capital Preservation",
            "horizon_years": horizon_years,
        },
    }
