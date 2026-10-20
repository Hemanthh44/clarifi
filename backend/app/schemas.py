from typing import Literal, Optional

from pydantic import BaseModel, Field

try:
    import email_validator  # noqa: F401
    from pydantic import EmailStr
except ImportError:
    EmailStr = str  # type: ignore[assignment,misc]


# ---------- Shared ----------

class Source(BaseModel):
    doc: str
    page: Optional[int] = None
    section: Optional[str] = None
    snippet: str
    url: Optional[str] = None
    domain: Optional[str] = None
    source_type: Literal["document", "web"] = "document"


class ComplianceMeta(BaseModel):
    source_grounded: bool
    explainability_available: bool
    advisory_status: Literal["educational_analytical"] = "educational_analytical"
    disclaimer: str
    flagged_terms: list[str] = Field(default_factory=list)


class AgentTraceStep(BaseModel):
    agent: str
    action: str


# ---------- /api/ask (Orchestrator) ----------

class AskRequest(BaseModel):
    message: str
    document_id: Optional[str] = None
    conversation_id: Optional[str] = None
    web_search: Optional[bool] = None
    action: str = "ask"


class AskResponse(BaseModel):
    agent_used: str
    answer: str
    key_points: list[str] = Field(default_factory=list)
    sources: list[Source] = Field(default_factory=list)
    trace: list[AgentTraceStep] = Field(default_factory=list)
    compliance: ComplianceMeta
    web_searched: bool = False
    # Structured "clear answer" fields (additive — older frontend code that
    # only reads answer/key_points/sources keeps working unchanged).
    # See app/llm/client.py narrate_grounded_answer / narrate_web_answer.
    explanation: Optional[str] = None
    why_it_matters: Optional[str] = None
    risks: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    evidence_strength: Optional[Literal["High", "Medium", "Low"]] = None


# ---------- ML: Risk Classification ----------

class RiskPredictRequest(BaseModel):
    equity: float = Field(ge=0, le=100)
    debt: float = Field(ge=0, le=100)
    others: float = Field(ge=0, le=100)
    horizon_years: float = Field(gt=0, le=50, default=5)
    num_assets: int = Field(ge=1, le=200, default=8)


class FeatureContribution(BaseModel):
    feature: str
    label: str
    contribution: float
    value: float
    direction: Literal["increases_risk", "mitigates_risk"]


class RiskPredictResponse(BaseModel):
    label: Literal["Low Risk", "Moderate Risk", "High Risk"]
    confidence: float
    probabilities: dict[str, float]
    factors: list[str]
    feature_contributions: list[FeatureContribution] = Field(default_factory=list)
    model: str
    dataset: str
    metrics: dict


class RebalanceRequest(BaseModel):
    equity: float = Field(ge=0, le=100)
    debt: float = Field(ge=0, le=100)
    others: float = Field(ge=0, le=100)
    target_label: Literal["Low Risk", "Moderate Risk", "High Risk"]
    horizon_years: float = Field(gt=0, le=50, default=5)
    num_assets: int = Field(ge=1, le=200, default=8)


class RebalanceResponse(BaseModel):
    target_label: str
    current_allocation: dict[str, float]
    recommended_allocation: dict[str, float]
    confidence: float
    shifts: list[str]
    distance: float


# ---------- Image Analysis ----------

class ImageAnalysisResponse(BaseModel):
    readable: bool
    readability: Literal["High", "Medium", "Low"]
    analysis: str
    extracted_values: dict = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    compliance: ComplianceMeta


# ---------- Risk ----------

# ---------- Risk ----------

class AssetAllocation(BaseModel):
    label: Literal["Equity", "Debt", "Others"]
    value: float = Field(ge=0, le=100)


class RiskScoreRequest(BaseModel):
    asset_mix: list[AssetAllocation]


class RiskScoreResponse(BaseModel):
    score: int
    label: str
    breakdown: list[dict]
    factors: list[str]
    compliance: ComplianceMeta


class StressTestRequest(BaseModel):
    scenario_id: Literal[
        "gfc-2008",
        "covid-2020",
        "taper-2013",
    ]
    portfolio_value: float = Field(gt=0)
    asset_mix: list[AssetAllocation]


class AssetImpact(BaseModel):
    label: str
    impact_pct: float


class StressTestResponse(BaseModel):
    scenario_id: str
    scenario_name: str
    period: str
    starting_value: float
    impact_value: float
    impact_pct: float
    drawdown_pct: float
    recovery_months: int
    risk_score_change: int
    asset_impact: list[AssetImpact]
    narrative: str
    compliance: ComplianceMeta


class MonteCarloTimelinePoint(BaseModel):
    year: int
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float


class MonteCarloTerminalMetrics(BaseModel):
    p10_bearish: float
    p50_median: float
    p90_bullish: float
    goal_success_probability: float
    one_year_var_95: float
    one_year_cvar_95: float


class MonteCarloRequest(BaseModel):
    starting_value: float = Field(gt=0, default=500000)
    asset_mix: list[AssetAllocation]
    horizon_years: int = Field(ge=1, le=30, default=10)
    monthly_sip: float = Field(ge=0, default=10000)
    target_goal: float = Field(ge=0, default=2500000)
    num_simulations: int = Field(ge=100, le=5000, default=1000)


class MonteCarloResponse(BaseModel):
    horizon_years: int
    starting_value: float
    monthly_sip: float
    total_invested: float
    target_goal: float
    expected_annual_return: float
    annual_volatility: float
    sharpe_ratio: float
    terminal_metrics: MonteCarloTerminalMetrics
    timeline: list[MonteCarloTimelinePoint]
    parameters: dict
    compliance: ComplianceMeta

# ---------- Scam Screener ----------

class ScamAnalyzeRequest(BaseModel):
    message: str


class RedFlag(BaseModel):
    label: str
    span: str
    pattern_id: str
    weight: float


class TokenAttribution(BaseModel):
    token: str
    weight: float
    type: Literal["scam_trigger", "trust_signal"]


class MLScamAnalysis(BaseModel):
    ml_score: float
    ml_label: str
    ml_confidence: float
    top_tokens: list[TokenAttribution] = Field(default_factory=list)
    model: str
    metrics: dict = Field(default_factory=dict)


class ScamAnalyzeResponse(BaseModel):
    risk_level: Literal["Low Risk", "Suspicious Pattern", "High Risk"]
    score: float
    flags: list[RedFlag]
    explanation: str
    detection_notes: str
    compliance: ComplianceMeta
    ml_analysis: Optional[MLScamAnalysis] = None
    ensemble_score: Optional[float] = None


# ---------- Summary Agent ----------

class PortfolioSummaryResponse(BaseModel):
    headline: str
    observations: list[str]
    compliance: ComplianceMeta


# ---------- Documents / RAG ----------

class DocumentMeta(BaseModel):
    id: str
    name: str
    category: str
    pages: int
    indexed: bool
    # ML-predicted financial document type (see app/ml/document_classifier.py),
    # e.g. "Mutual Fund", "Insurance". Optional/nullable — older documents
    # uploaded before this feature existed simply won't have one.
    ml_category: Optional[str] = None
    ml_confidence: Optional[float] = None


class DocumentListResponse(BaseModel):
    documents: list[DocumentMeta]

# ---------- Portfolio ----------

class PortfolioSaveRequest(BaseModel):
    value: float = Field(gt=0)
    equity: float = Field(ge=0, le=100)
    debt: float = Field(ge=0, le=100)
    others: float = Field(ge=0, le=100)
    goals_on_track: int = Field(default=0, ge=0)
    goals_total: int = Field(default=0, ge=0)


class PortfolioResponse(BaseModel):
    portfolio: dict


# ---------- Auth ----------

class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserPublic(BaseModel):
    """Everything the frontend needs to render an account. Never includes
    password_hash."""

    id: str
    name: str
    email: str
    initials: str
    created_at: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserPublic


# ---------- Reinforcement Learning (RL) Portfolio Agent ----------

class RLSimulateRequest(BaseModel):
    starting_value: float = Field(gt=0, default=500000)
    equity: float = Field(ge=0, le=100, default=60)
    debt: float = Field(ge=0, le=100, default=30)
    others: float = Field(ge=0, le=100, default=10)
    horizon_years: int = Field(ge=1, le=30, default=10)
    monthly_sip: float = Field(ge=0, default=10000)
    risk_tolerance: Literal["Conservative", "Balanced", "Aggressive"] = "Balanced"


class RLYearStep(BaseModel):
    year: int
    regime: str
    is_live_market: bool = False
    action: str
    action_label: str
    rationale: str
    equity_pct: float
    debt_pct: float
    others_pct: float
    period_return_pct: float
    portfolio_value: float


class RLStrategyMetrics(BaseModel):
    final_value: float
    total_invested: float
    net_gain: float
    cumulative_return_pct: float
    cagr_pct: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown_pct: float
    annual_volatility_pct: float


class RLBenchmarkComparison(BaseModel):
    rl_agent: RLStrategyMetrics
    buy_and_hold: RLStrategyMetrics
    fixed_60_40: RLStrategyMetrics


class RLSimulateResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    executive_summary: str
    parameters: dict
    benchmarks: RLBenchmarkComparison
    timeline: list[RLYearStep]
    chart_data: list[dict]
    action_distribution: list[dict]
    training_convergence: list[dict]
    actions_catalog: list[dict]
    model_metadata: dict
    live_market: dict | None = None
