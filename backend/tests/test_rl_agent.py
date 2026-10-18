from app.ml.rl_agent import (
    ACTIONS,
    ACTION_NAMES,
    NUM_ACTIONS,
    TOTAL_STATES,
    PortfolioRLAgent,
    get_trained_rl_agent,
    simulate_rl_portfolio,
)


def test_rl_agent_initialization_and_training():
    agent = PortfolioRLAgent(random_seed=42)
    assert agent.q_table.shape == (TOTAL_STATES, NUM_ACTIONS)
    assert not agent.is_trained

    # Train for a small number of episodes in test
    agent.train(episodes=200)
    assert agent.is_trained
    assert len(agent.training_convergence) > 0
    assert agent.q_table.any()


def test_cached_rl_agent_converges():
    agent = get_trained_rl_agent()
    assert agent.is_trained
    assert agent.q_table.shape == (81, 5)
    # Check that best action is valid
    best_action = agent.select_best_action(equity=70.0, horizon_years=1.0, regime_id=0, drift_pct=-6.0)
    assert 0 <= best_action < NUM_ACTIONS


def test_simulate_rl_portfolio_structure():
    result = simulate_rl_portfolio(
        starting_value=500000.0,
        equity=60.0,
        debt=30.0,
        others=10.0,
        horizon_years=7,
        monthly_sip=10000.0,
        risk_tolerance="Balanced",
    )

    assert "executive_summary" in result
    assert "benchmarks" in result
    assert "timeline" in result
    assert "chart_data" in result
    assert "action_distribution" in result

    # Check benchmark metrics exist for all 3 strategies
    benchmarks = result["benchmarks"]
    assert "rl_agent" in benchmarks
    assert "buy_and_hold" in benchmarks
    assert "fixed_60_40" in benchmarks

    for strat_key in ["rl_agent", "buy_and_hold", "fixed_60_40"]:
        metrics = benchmarks[strat_key]
        assert metrics["final_value"] > 0
        assert "sharpe_ratio" in metrics
        assert "max_drawdown_pct" in metrics
        assert "cagr_pct" in metrics

    # Check timeline has 7 years
    assert len(result["timeline"]) == 7
    for step in result["timeline"]:
        assert 1 <= step["year"] <= 7
        assert step["action"] in ACTION_NAMES
        assert step["portfolio_value"] > 0
        assert 0.0 <= step["equity_pct"] <= 100.0


def test_actions_catalog_validity():
    assert len(ACTIONS) == 5
    for a in ACTIONS:
        assert "id" in a
        assert "name" in a
        assert "label" in a
        assert "description" in a
