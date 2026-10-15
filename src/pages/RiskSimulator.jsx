import { useState } from "react";
import { Activity, RotateCcw, ShieldCheck } from "lucide-react";
import AppLayout from "../layouts/AppLayout";
import { Card, Badge, Disclaimer } from "../components/Basics";
import { RiskScoreCard } from "../components/RiskScore";
import StressTestTimeMachine from "../components/StressTestTimeMachine";
import { calculateRiskScore, getPortfolio } from "../lib/api";

export default function RiskSimulator() {
  const [portfolioValue, setPortfolioValue] = useState("");
  const [equity, setEquity] = useState("");
  const [debt, setDebt] = useState("");
  const [others, setOthers] = useState("");
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const total = Number(equity || 0) + Number(debt || 0) + Number(others || 0);

  const loadSavedPortfolio = async () => {
    try {
      const r = await getPortfolio();
      const saved = r.portfolio;
      const mix = saved.assetMix || [];
      setPortfolioValue(saved.value);
      setEquity(mix.find((a) => a.label === "Equity")?.value ?? "");
      setDebt(mix.find((a) => a.label === "Debt")?.value ?? "");
      setOthers(mix.find((a) => a.label === "Others")?.value ?? "");
      setError("");
    } catch {
      setError("No saved portfolio is available yet. Add one in Portfolio Overview first.");
    }
  };

  const assetMix = [
    { label: "Equity", value: Number(equity || 0) },
    { label: "Debt", value: Number(debt || 0) },
    { label: "Others", value: Number(others || 0) },
  ];

  const calculate = async () => {
    setError("");
    if (!Number(portfolioValue) || Number(portfolioValue) <= 0) {
      setError("Please enter a portfolio value greater than zero.");
      return;
    }
    if (Math.abs(total - 100) > 0.01) {
      setError(`Asset weights must total 100%. Current total: ${total}%.`);
      return;
    }
    try {
      setLoading(true);
      const r = await calculateRiskScore(assetMix);
      setPortfolio({
        value: Number(portfolioValue),
        riskScore: r.score,
        riskLabel: r.label,
        riskBreakdown: r.breakdown,
        riskFactors: r.factors,
        assetMix,
      });
    } catch (e) {
      setError(e.message || "Risk calculation failed.");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setPortfolioValue("");
    setEquity("");
    setDebt("");
    setOthers("");
    setPortfolio(null);
    setError("");
  };

  const input = (label, value, setValue, placeholder) => (
    <label className="block">
      <span className="block text-xs font-mono font-medium text-text-secondary uppercase mb-2">
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          min="0"
          max="100"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full cf-input px-3.5 py-2.5 text-sm font-mono text-text-primary outline-none"
        />
        <span className="absolute right-3.5 top-2.5 text-xs font-mono text-text-muted">%</span>
      </div>
    </label>
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-brand-roseLight border border-brand-roseBorder shadow-subtle flex items-center justify-center shrink-0">
              <Activity size={20} className="text-brand-berry" strokeWidth={2} />
            </div>
            <div>
              <p className="cf-eyebrow mb-1">DETERMINISTIC SIMULATION ENGINE</p>
              <h1 className="text-3xl font-bold text-text-primary">Risk Simulator</h1>
              <p className="text-sm text-text-secondary mt-1">
                Complex financial modeling made understandable · Model allocation sensitivity and historical shocks.
              </p>
            </div>
          </div>
          <button
            onClick={clear}
            className="text-xs font-semibold text-text-muted hover:text-brand-berry inline-flex items-center gap-1.5 transition-colors pt-2"
          >
            <RotateCcw size={13} /> Reset model
          </button>
        </div>

        {/* Input Laboratory Card */}
        <div className="grid lg:grid-cols-[1fr_1fr] gap-6 mb-8">
          <Card className="p-6 sm:p-8 bg-white border border-[#EDE7EB] shadow-subtle rounded-2xl">
            <div className="flex items-center justify-between mb-6 border-b border-[#EDE7EB] pb-3">
              <div>
                <p className="text-xs font-semibold tracking-wider text-text-muted uppercase">
                  SIMULATION INPUTS
                </p>
                <h2 className="text-xl font-bold text-text-primary mt-0.5">
                  Allocation Weights
                </h2>
              </div>
              <Badge tone="accent">Mathematical Engine</Badge>
            </div>

            <label className="block mb-4">
              <span className="block text-xs font-semibold text-text-secondary uppercase mb-2">
                Simulated Portfolio Capital (₹)
              </span>
              <input
                type="number"
                min="1"
                value={portfolioValue}
                onChange={(e) => setPortfolioValue(e.target.value)}
                placeholder="e.g. 1000000"
                className="w-full cf-input px-3.5 py-2.5 text-sm font-mono text-text-primary outline-none"
              />
            </label>

            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              {input("Equity", equity, setEquity, "60")}
              {input("Debt", debt, setDebt, "30")}
              {input("Others", others, setOthers, "10")}
            </div>

            <button
              type="button"
              onClick={loadSavedPortfolio}
              className="text-xs font-semibold text-brand-berry hover:underline block mb-4"
            >
              Sync saved Portfolio Overview holdings →
            </button>

            <div className="p-3.5 rounded-xl border border-[#EDE7EB] bg-[#FAF7F9] flex items-center justify-between text-xs font-mono">
              <span className="text-text-muted">Total percentage:</span>
              <span className={`font-semibold ${Math.abs(total - 100) < 0.01 ? "text-emerald-700" : "text-rose-600"}`}>
                {total}% {Math.abs(total - 100) < 0.01 ? "(Valid)" : "(Must sum to 100%)"}
              </span>
            </div>

            {error && (
              <p className="mt-4 text-xs font-mono text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                {error}
              </p>
            )}

            <button
              onClick={calculate}
              disabled={loading}
              className="w-full mt-6 rounded-full bg-brand-berry text-white hover:bg-brand-berryDark transition-all text-xs font-semibold py-3.5 shadow-sm disabled:opacity-50"
            >
              {loading ? "Executing risk models..." : "Calculate risk metrics"}
            </button>

            <Disclaimer className="mt-4 border-t border-[#EDE7EB] pt-3" />
          </Card>

          {/* Model Principles Card */}
          <Card className="p-6 sm:p-8 bg-white border border-[#EDE7EB] shadow-subtle rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex gap-3 items-start mb-6">
                <ShieldCheck className="text-emerald-700 mt-1 shrink-0" size={20} />
                <div>
                  <h3 className="text-xl font-bold text-text-primary">
                    Deterministic Risk Modeling
                  </h3>
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                    The risk score is calculated via covariance matrices and historical asset class volatility
                    curves executed in a pure Python engine. Zero hallucinations.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  ["Volatility Index", "Weighted asset variance across market cycles."],
                  ["Downside Drawdown", "Historic peak-to-trough decline vulnerability."],
                  ["Asset Concentration", "Diversification penalty applied to high single-asset weights."],
                ].map(([title, desc]) => (
                  <div key={title} className="p-3.5 rounded-xl bg-[#FAF8F5] border border-black/[0.05]">
                    <p className="text-xs font-mono font-semibold text-text-primary">{title}</p>
                    <p className="text-xs text-text-muted mt-0.5 font-sans">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-black/[0.06] text-[0.72rem] font-mono text-text-muted">
              Audited mathematical model · Real historical drawdown replays
            </div>
          </Card>
        </div>

        {/* Results Stream */}
        {portfolio && (
          <div className="space-y-6 animate-rise">
            <RiskScoreCard portfolio={portfolio} />
            <StressTestTimeMachine portfolio={portfolio} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
