import { useEffect, useState } from "react";
import { ArrowDown, TrendingDown } from "lucide-react";
import { Card, Badge } from "./Basics";
import { getStressTestScenarios, runStressTest } from "../lib/api";

function formatINR(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export default function StressTestTimeMachine({ portfolio }) {
  const [scenarios, setScenarios] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [result, setResult] = useState(null);

  const [loadingScenarios, setLoadingScenarios] = useState(true);
  const [loadingTest, setLoadingTest] = useState(false);
  const [error, setError] = useState("");

  /* Get available historical scenarios from FastAPI */
  useEffect(() => {
    async function loadScenarios() {
      try {
        setLoadingScenarios(true);
        const data = await getStressTestScenarios();
        setScenarios(data);
        if (data.length > 0) {
          setActiveId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load scenarios:", err);
        setError("Unable to load stress-test scenarios.");
      } finally {
        setLoadingScenarios(false);
      }
    }
    loadScenarios();
  }, []);

  /* Run stress test when portfolio or scenario changes */
  useEffect(() => {
    if (!portfolio || !activeId) return;

    async function executeStressTest() {
      try {
        setLoadingTest(true);
        setError("");
        const data = await runStressTest(
          activeId,
          portfolio.value,
          portfolio.assetMix
        );
        setResult(data);
      } catch (err) {
        console.error("Stress test failed:", err);
        setError(err.message || "Unable to run stress test.");
      } finally {
        setLoadingTest(false);
      }
    }
    executeStressTest();
  }, [portfolio, activeId]);

  if (loadingScenarios) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-mono text-text-muted">Loading historical shock models...</p>
      </Card>
    );
  }

  if (!portfolio) return null;

  return (
    <Card className="p-6 sm:p-8 bg-white border border-[#EDE7EB] shadow-subtle rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 border-b border-[#EDE7EB] pb-4">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-text-muted mb-1">
            STRESS-TEST TIME MACHINE
          </p>
          <h3 className="text-2xl font-bold text-text-primary">
            Historical portfolio shock replay
          </h3>
        </div>
        <Badge tone="accent">Deterministic Risk Engine</Badge>
      </div>

      {/* Scenario selector */}
      <div className="flex flex-wrap gap-2 mb-8">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => setActiveId(scenario.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeId === scenario.id
                ? "bg-brand-berry text-white shadow-sm"
                : "bg-[#FAF7F9] border border-[#EDE7EB] text-text-secondary hover:text-brand-berry hover:border-brand-berry"
            }`}
          >
            {scenario.name}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-xs font-mono text-rose-800">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loadingTest && (
        <div className="py-12 text-center">
          <p className="text-xs text-text-muted">
            Simulating portfolio allocation against historical market shocks...
          </p>
        </div>
      )}

      {/* Result */}
      {!loadingTest && result && (
        <>
          {/* Timeline visualization */}
          <div className="relative h-1.5 bg-[#F4EFF3] rounded-full mb-10 mt-4">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-berry to-brand-rose rounded-full"
              style={{ width: "100%" }}
            />
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-brand-berry shadow-sm" />
            <p className="absolute top-4 left-1/2 -translate-x-1/2 text-xs font-medium text-text-muted whitespace-nowrap">
              {result.period}
            </p>
          </div>

          {/* Impact flow */}
          <div className="grid sm:grid-cols-[1fr,auto,1fr] items-center gap-6 mb-8 py-2">
            <div className="text-center sm:text-right">
              <p className="text-xs font-semibold text-text-muted uppercase mb-1">
                STARTING PORTFOLIO
              </p>
              <p className="text-3xl font-bold text-text-primary tabular">
                {formatINR(result.starting_value)}
              </p>
            </div>

            <div className="flex justify-center">
              <div className="flex flex-col items-center text-text-muted px-3.5 py-2 bg-[#FAF7F9] rounded-2xl border border-[#EDE7EB]">
                <ArrowDown size={14} className="text-brand-berry" />
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider my-0.5">
                  Historical shock
                </span>
                <ArrowDown size={14} className="text-rose-600" />
              </div>
            </div>

            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold text-text-muted uppercase mb-1">
                PROJECTED DRAWDOWN
              </p>
              <p className="text-3xl font-bold text-rose-600 tabular">
                {formatINR(result.impact_value)}
              </p>
              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 justify-center sm:justify-start mt-1">
                <TrendingDown size={14} />
                {result.impact_pct}% drawdown
              </p>
            </div>
          </div>

          {/* Narrative */}
          <div className="text-sm text-text-secondary leading-relaxed mb-6 bg-[#FAF7F9] rounded-2xl p-4 border border-[#EDE7EB]">
            <p className="text-xs font-semibold tracking-wider text-text-muted uppercase mb-1">
              HISTORICAL CONTEXT
            </p>
            <p>{result.narrative}</p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Max drawdown", value: `${result.drawdown_pct}%` },
              { label: "Recovery period", value: `${result.recovery_months} mo` },
              { label: "Risk score shift", value: `+${result.risk_score_change}` },
              { label: "Shock period", value: result.period },
            ].map((metric) => (
              <div key={metric.label} className="bg-[#FAF7F9] rounded-xl p-3.5 border border-[#EDE7EB]">
                <p className="text-xs font-medium text-text-muted uppercase mb-1">{metric.label}</p>
                <p className="text-lg font-bold text-text-primary tabular">{metric.value}</p>
              </div>
            ))}
          </div>

          {/* Asset impact */}
          <p className="text-xs font-semibold tracking-wider uppercase text-text-muted mb-3">
            ASSET-CLASS BREAKDOWN
          </p>

          <div className="space-y-2.5">
            {result.asset_impact.map((asset) => (
              <div key={asset.label} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-text-secondary w-16 shrink-0">{asset.label}</span>
                <div className="flex-1 h-2 rounded-full bg-[#F4EFF3] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-rose-500"
                    style={{
                      width: `${Math.min(Math.abs(asset.impact_pct) * 2, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-rose-600 tabular w-14 text-right">
                  {asset.impact_pct}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}