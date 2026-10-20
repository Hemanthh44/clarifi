import { useEffect, useState } from "react";
import {
  Brain,
  Sliders,
  TrendingUp,
  Shield,
  Activity,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Target,
  BarChart2,
  Table as TableIcon,
  Cpu,
  Play,
  Award,
  ArrowUpRight,
  Compass,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import AppLayout from "../layouts/AppLayout";
import { Card, Badge, PageHeader, Panel } from "../components/Basics";
import Button from "../components/Button";
import LiveMarketPulse from "../components/LiveMarketPulse";
import { predictRisk, rebalancePortfolio, runMonteCarlo, getPortfolio, runRLSimulation } from "../lib/api";

const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function MlLab() {
  const [activeTab, setActiveTab] = useState("risk-xai"); // 'risk-xai' | 'monte-carlo' | 'rl-agent'

  // --- ML Risk & XAI State ---
  const [equity, setEquity] = useState(60);
  const [debt, setDebt] = useState(30);
  const [others, setOthers] = useState(10);
  const [horizonYears, setHorizonYears] = useState(7);
  const [numAssets, setNumAssets] = useState(8);

  const [prediction, setPrediction] = useState(null);
  const [loadingPred, setLoadingPred] = useState(false);
  const [predError, setPredError] = useState("");

  // Rebalancing state
  const [targetLabel, setTargetLabel] = useState("Low Risk");
  const [rebalanceResult, setRebalanceResult] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  // --- Monte Carlo State ---
  const [mcStarting, setMcStarting] = useState(500000);
  const [mcSip, setMcSip] = useState(15000);
  const [mcHorizon, setMcHorizon] = useState(10);
  const [mcTarget, setMcTarget] = useState(5000000);
  const [mcResult, setMcResult] = useState(null);
  const [loadingMc, setLoadingMc] = useState(false);

  // --- Smart Dynamic Strategy (Glidepath) State ---
  const [rlStarting, setRlStarting] = useState(500000);
  const [rlSip, setRlSip] = useState(10000);
  const [rlHorizon, setRlHorizon] = useState(10);
  const [rlRiskTolerance, setRlRiskTolerance] = useState("Balanced");
  const [rlResult, setRlResult] = useState(null);
  const [loadingRL, setLoadingRL] = useState(false);
  const [rlError, setRlError] = useState("");

  // Auto-fetch prediction when risk sliders change
  useEffect(() => {
    let cancelled = false;
    const fetchPrediction = async () => {
      setLoadingPred(true);
      try {
        const res = await predictRisk({
          equity: Number(equity),
          debt: Number(debt),
          others: Number(others),
          horizonYears: Number(horizonYears),
          numAssets: Number(numAssets),
        });
        if (!cancelled) {
          setPrediction(res);
          setPredError("");
        }
      } catch (err) {
        if (!cancelled) setPredError(err.message || "Failed to calculate prediction");
      } finally {
        if (!cancelled) setLoadingPred(false);
      }
    };

    fetchPrediction();
    return () => {
      cancelled = true;
    };
  }, [equity, debt, others, horizonYears, numAssets]);

  // Run Monte Carlo Simulation
  const executeMonteCarlo = async () => {
    setLoadingMc(true);
    try {
      const res = await runMonteCarlo({
        startingValue: Number(mcStarting),
        assetMix: [
          { label: "Equity", value: Number(equity) },
          { label: "Debt", value: Number(debt) },
          { label: "Others", value: Number(others) },
        ],
        horizonYears: Number(mcHorizon),
        monthlySip: Number(mcSip),
        targetGoal: Number(mcTarget),
        numSimulations: 1000,
      });
      setMcResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMc(false);
    }
  };

  // Initial Monte Carlo load
  useEffect(() => {
    executeMonteCarlo();
  }, [equity, debt, others, mcHorizon]);

  // Execute Smart Dynamic Strategy Simulation
  const executeRLSimulation = async () => {
    setLoadingRL(true);
    setRlError("");
    try {
      const res = await runRLSimulation({
        startingValue: Number(rlStarting),
        equity: Number(equity),
        debt: Number(debt),
        others: Number(others),
        horizonYears: Number(rlHorizon),
        monthlySip: Number(rlSip),
        riskTolerance: rlRiskTolerance,
      });
      setRlResult(res);
    } catch (err) {
      console.error(err);
      setRlError(err.message || "Failed to execute RL policy simulation");
    } finally {
      setLoadingRL(false);
    }
  };

  // Run RL simulation when entering the tab for the first time
  useEffect(() => {
    if (activeTab === "rl-agent" && !rlResult && !loadingRL) {
      executeRLSimulation();
    }
  }, [activeTab]);

  // Load saved portfolio if exists
  const loadSavedPortfolio = async () => {
    try {
      const r = await getPortfolio();
      const mix = r.portfolio.assetMix || [];
      const eq = mix.find((a) => a.label === "Equity")?.value ?? 60;
      const db = mix.find((a) => a.label === "Debt")?.value ?? 30;
      const ot = mix.find((a) => a.label === "Others")?.value ?? 10;
      setEquity(eq);
      setDebt(db);
      setOthers(ot);
      if (r.portfolio.value) {
        setMcStarting(r.portfolio.value);
      }
    } catch {
      // ignore
    }
  };

  // Handle Equity slider move with auto-normalization of debt/others
  const handleEquityChange = (newEq) => {
    const val = Number(newEq);
    setEquity(val);
    const rem = 100 - val;
    const currentSum = debt + others || 1;
    const newDebt = Math.round((debt / currentSum) * rem);
    const newOthers = rem - newDebt;
    setDebt(Math.max(0, newDebt));
    setOthers(Math.max(0, newOthers));
  };

  const handleDebtChange = (newDb) => {
    const val = Number(newDb);
    setDebt(val);
    const rem = 100 - val;
    const currentSum = equity + others || 1;
    const newEq = Math.round((equity / currentSum) * rem);
    const newOthers = rem - newEq;
    setEquity(Math.max(0, newEq));
    setOthers(Math.max(0, newOthers));
  };

  // Optimize Rebalance
  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const res = await rebalancePortfolio({
        equity: Number(equity),
        debt: Number(debt),
        others: Number(others),
        targetLabel,
        horizonYears: Number(horizonYears),
        numAssets: Number(numAssets),
      });
      setRebalanceResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setOptimizing(false);
    }
  };

  const applyRebalance = () => {
    if (!rebalanceResult?.recommended_allocation) return;
    const { equity: e, debt: d, others: o } = rebalanceResult.recommended_allocation;
    setEquity(e);
    setDebt(d);
    setOthers(o);
    setRebalanceResult(null);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
        <PageHeader
          eyebrow="PORTFOLIO & STRATEGY INTELLIGENCE"
          title="Strategy Lab"
          description="Interactive risk health diagnostics, key factor drivers, dynamic glidepath rebalancing, and long-term wealth projections."
          icon={TrendingUp}
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              onClick={loadSavedPortfolio}
              className="text-xs"
            >
              Sync My Portfolio
            </Button>
          }
          className="mb-6"
        />

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#EDE7EB] mb-8 pb-3">
          <button
            onClick={() => setActiveTab("risk-xai")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === "risk-xai"
                ? "bg-brand-berry text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-[#FAF7F9]"
            }`}
          >
            <Shield size={15} />
            Risk Health &amp; Diagnostics
          </button>
          <button
            onClick={() => setActiveTab("monte-carlo")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === "monte-carlo"
                ? "bg-brand-berry text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-[#FAF7F9]"
            }`}
          >
            <TrendingUp size={15} />
            Wealth Growth Projections (1,000 Scenarios)
          </button>
          <button
            onClick={() => setActiveTab("rl-agent")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === "rl-agent"
                ? "bg-brand-berry text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-[#FAF7F9]"
            }`}
          >
            <Compass size={15} />
            Smart Dynamic Rebalancing (Adaptive Glidepath)
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: ML RISK CLASSIFIER & EXPLAINABILITY (XAI) */}
        {/* ========================================================= */}
        {activeTab === "risk-xai" && (
          <div className="space-y-8">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8">
              {/* Left Column: Interactive Feature Sliders */}
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                        <Sliders size={18} className="text-brand-berry" /> Portfolio Asset Mix
                      </h2>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Adjust your allocation and timeline to evaluate instant risk diagnostics.
                      </p>
                    </div>
                    <Badge tone="accent" className="font-mono text-[0.7rem]">
                      Portfolio Allocation
                    </Badge>
                  </div>

                  {/* Sliders */}
                  <div className="space-y-5">
                    {/* Equity */}
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span className="text-text-primary">Equity Allocation</span>
                        <span className="font-mono font-bold text-brand-berry">{equity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={equity}
                        onChange={(e) => handleEquityChange(e.target.value)}
                        className="w-full accent-brand-berry h-1.5 bg-[#EDE7EB] rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Debt */}
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span className="text-text-primary">Debt / Fixed Income</span>
                        <span className="font-mono font-bold text-emerald-700">{debt}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={debt}
                        onChange={(e) => handleDebtChange(e.target.value)}
                        className="w-full accent-emerald-600 h-1.5 bg-[#EDE7EB] rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Others */}
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span className="text-text-primary">Gold / Real Estate / Others</span>
                        <span className="font-mono font-bold text-amber-700">{others}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={others}
                        readOnly
                        className="w-full accent-amber-600 h-1.5 bg-[#EDE7EB] rounded-lg cursor-not-allowed opacity-75"
                      />
                      <p className="text-[0.68rem] text-text-muted mt-1">
                        Automatically balanced to guarantee 100% total allocation.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#EDE7EB] grid grid-cols-2 gap-4">
                      {/* Horizon */}
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1.5">
                          <span className="text-text-primary">Investment Horizon</span>
                          <span className="font-mono font-bold text-text-primary">{horizonYears} yrs</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="25"
                          value={horizonYears}
                          onChange={(e) => setHorizonYears(Number(e.target.value))}
                          className="w-full accent-brand-berry h-1.5 bg-[#EDE7EB] rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Number of Assets */}
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1.5">
                          <span className="text-text-primary">Total Holdings</span>
                          <span className="font-mono font-bold text-text-primary">{numAssets} assets</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="30"
                          value={numAssets}
                          onChange={(e) => setNumAssets(Number(e.target.value))}
                          className="w-full accent-brand-berry h-1.5 bg-[#EDE7EB] rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Target Risk Rebalance Optimizer */}
                <Card className="p-6 border-brand-roseBorder bg-[#FFFDFE]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                        <Zap size={16} className="text-brand-berry" /> Target Risk Rebalancer
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Calculates the minimal portfolio adjustment to match your preferred risk target.
                      </p>
                    </div>
                    <Badge tone="accent">Smart Rebalancing</Badge>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-medium text-text-secondary">Desired Risk Target:</span>
                    {["Low Risk", "Moderate Risk", "High Risk"].map((lbl) => (
                      <button
                        key={lbl}
                        onClick={() => setTargetLabel(lbl)}
                        className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                          targetLabel === lbl
                            ? "bg-brand-berry text-white font-semibold shadow-xs"
                            : "bg-[#FAF7F9] border border-[#EDE7EB] text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                    <Button
                      size="sm"
                      onClick={handleOptimize}
                      disabled={optimizing}
                      className="ml-auto text-xs py-1.5"
                    >
                      {optimizing ? "Calculating..." : "Compute Shift"}
                    </Button>
                  </div>

                  {rebalanceResult && (
                    <div className="p-4 rounded-xl bg-white border border-[#EDE7EB] space-y-3 mt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-primary">
                          Recommended Allocation ({rebalanceResult.target_label}):
                        </span>
                        <span className="text-xs font-mono text-brand-berry font-bold">
                          {rebalanceResult.confidence * 100}% Fit Score
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center py-2 bg-[#FAF7F9] rounded-lg font-mono text-xs">
                        <div>
                          <span className="text-text-muted block text-[0.65rem]">EQUITY</span>
                          <span className="font-bold text-text-primary">{rebalanceResult.recommended_allocation.equity}%</span>
                        </div>
                        <div>
                          <span className="text-text-muted block text-[0.65rem]">DEBT</span>
                          <span className="font-bold text-text-primary">{rebalanceResult.recommended_allocation.debt}%</span>
                        </div>
                        <div>
                          <span className="text-text-muted block text-[0.65rem]">OTHERS</span>
                          <span className="font-bold text-text-primary">{rebalanceResult.recommended_allocation.others}%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {rebalanceResult.shifts.map((s, idx) => (
                          <p key={idx} className="text-xs text-text-secondary flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-berry shrink-0" />
                            {s}
                          </p>
                        ))}
                      </div>
                      <Button size="sm" variant="secondary" onClick={applyRebalance} className="w-full text-xs mt-2">
                        Apply Recommended Shift to Sliders
                      </Button>
                    </div>
                  )}
                </Card>
              </div>

              {/* Right Column: Model Output & Explainable AI (XAI) Waterfall */}
              <div className="space-y-6">
                {/* Prediction Result Card */}
                <Card className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="cf-eyebrow mb-1">PORTFOLIO RISK DIAGNOSTIC</p>
                      <h3 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        {prediction?.label || "Analyzing..."}
                        {prediction?.confidence && (
                          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {(prediction.confidence * 100).toFixed(1)}% Confidence
                          </span>
                        )}
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowMetricsModal(true)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-berry hover:underline"
                    >
                      <TableIcon size={13} /> View Diagnostic Accuracy
                    </button>
                  </div>

                  {/* Risk Category Likelihood Bars */}
                  <div className="space-y-2.5 mb-6">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Risk Category Likelihood
                    </p>
                    {prediction?.probabilities &&
                      Object.entries(prediction.probabilities).map(([cls, prob]) => {
                        const isWinner = cls === prediction.label;
                        return (
                          <div key={cls} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className={isWinner ? "font-bold text-text-primary" : "text-text-secondary"}>
                                {cls}
                              </span>
                              <span className="font-mono font-medium text-text-primary">
                                {(prob * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-[#EDE7EB] rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 rounded-full ${
                                  cls === "Low Risk"
                                    ? "bg-emerald-500"
                                    : cls === "Moderate Risk"
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`}
                                style={{ width: `${Math.max(3, prob * 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Key Risk Drivers */}
                  <div className="pt-5 border-t border-[#EDE7EB]">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                          <Sparkles size={14} className="text-brand-berry" /> Key Risk Drivers
                        </h4>
                        <p className="text-[0.68rem] text-text-muted">
                          Breakdown of how each portfolio characteristic influences your overall risk level.
                        </p>
                      </div>
                      <Badge tone="neutral" className="text-[0.65rem]">
                        Factor Breakdown
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {prediction?.feature_contributions?.map((fc, i) => {
                        const isRiskIncr = fc.direction === "increases_risk";
                        const absWeight = Math.min(100, Math.abs(fc.contribution) * 80);
                        return (
                          <div key={i} className="p-2.5 rounded-xl bg-[#FAF7F9] border border-[#EDE7EB]">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-medium text-text-primary">{fc.label}</span>
                              <span
                                className={`font-mono font-bold text-xs ${
                                  isRiskIncr ? "text-rose-600" : "text-emerald-700"
                                }`}
                              >
                                {fc.contribution > 0 ? `+${fc.contribution}` : fc.contribution} impact
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-[#EDE7EB] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isRiskIncr ? "bg-rose-500" : "bg-emerald-600"
                                }`}
                                style={{ width: `${Math.max(5, absWeight)}%` }}
                              />
                            </div>
                            <p className="text-[0.65rem] text-text-muted mt-1">
                              Current input: <strong className="text-text-secondary">{fc.value}</strong> •{" "}
                              {isRiskIncr ? "Drives portfolio risk upwards" : "Provides stabilizing diversification buffer"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Model Diagnostic Accuracy Modal */}
            {showMetricsModal && prediction?.metrics && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                <Card className="max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Badge tone="accent">DIAGNOSTIC BENCHMARKS &amp; ACCURACY</Badge>
                      <h3 className="text-lg font-bold text-text-primary mt-1">
                        Risk Engine Performance &amp; Accuracy
                      </h3>
                      <p className="text-xs text-text-secondary">
                        Evaluated across historical validation profiles (N = {prediction.metrics.test_set_size} portfolios).
                      </p>
                    </div>
                    <button
                      onClick={() => setShowMetricsModal(false)}
                      className="text-text-muted hover:text-text-primary font-bold text-base p-1"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Summary Metric Stats */}
                  <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                    <div className="p-2.5 rounded-lg bg-[#FAF7F9] border border-[#EDE7EB]">
                      <span className="text-[0.65rem] text-text-muted block">ACCURACY</span>
                      <span className="text-base font-bold text-brand-berry font-mono">
                        {(prediction.metrics.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#FAF7F9] border border-[#EDE7EB]">
                      <span className="text-[0.65rem] text-text-muted block">PRECISION</span>
                      <span className="text-base font-bold text-emerald-700 font-mono">
                        {(prediction.metrics.macro_precision * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#FAF7F9] border border-[#EDE7EB]">
                      <span className="text-[0.65rem] text-text-muted block">RECALL</span>
                      <span className="text-base font-bold text-amber-700 font-mono">
                        {(prediction.metrics.macro_recall * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#FAF7F9] border border-[#EDE7EB]">
                      <span className="text-[0.65rem] text-text-muted block">F1 SCORE</span>
                      <span className="text-base font-bold text-text-primary font-mono">
                        {(prediction.metrics.macro_f1 * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Outcome Matrix Table */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-text-primary mb-2">Diagnostic Outcome Matrix:</p>
                    <table className="w-full text-xs border border-[#EDE7EB] rounded-lg overflow-hidden text-center">
                      <thead className="bg-[#FAF7F9] text-text-muted text-[0.7rem]">
                        <tr>
                          <th className="p-2 text-left">Actual \ Assessed</th>
                          <th className="p-2">Low</th>
                          <th className="p-2">Moderate</th>
                          <th className="p-2">High</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EDE7EB] font-mono">
                        {prediction.metrics.confusion?.labels?.map((lbl, rowIdx) => (
                          <tr key={lbl}>
                            <td className="p-2 text-left font-sans font-medium text-text-secondary">{lbl}</td>
                            {prediction.metrics.confusion.matrix[rowIdx].map((val, colIdx) => (
                              <td
                                key={colIdx}
                                className={`p-2 font-bold ${
                                  rowIdx === colIdx ? "bg-emerald-50 text-emerald-800" : "text-text-muted"
                                }`}
                              >
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[0.7rem] text-text-muted leading-relaxed mb-4">
                    Calibrated multi-factor risk engine designed to ensure consistent, reliable categorization across diverse market conditions.
                  </p>

                  <Button size="sm" onClick={() => setShowMetricsModal(false)} className="w-full text-xs">
                    Close Accuracy View
                  </Button>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: STOCHASTIC MONTE CARLO SIMULATOR */}
        {/* ========================================================= */}
        {activeTab === "monte-carlo" && (
          <div className="space-y-8">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
              {/* Left Column: Simulation Chart & Fan Chart */}
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <Badge tone="accent" className="mb-1">
                      1,000 SIMULATED MARKET SCENARIOS
                    </Badge>
                    <h3 className="text-xl font-bold text-text-primary">Wealth Growth Projections</h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Visualizing conservative, median expected, and optimistic market growth boundaries over time.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-text-muted">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Median Expected
                    </span>
                    <span className="flex items-center gap-1.5 text-text-muted">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-200" /> 10-90% Confidence Band
                    </span>
                  </div>
                </div>

                {/* Recharts Area Chart */}
                <div className="h-80 w-full">
                  {mcResult?.timeline ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mcResult.timeline} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EDE7EB" vertical={false} />
                        <XAxis
                          dataKey="year"
                          tickFormatter={(yr) => `Yr ${yr}`}
                          stroke="#8A9DBA"
                          fontSize={11}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                          stroke="#8A9DBA"
                          fontSize={11}
                          tickLine={false}
                          domain={["auto", "auto"]}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            money(value),
                            name === "p90"
                              ? "Bullish Ceiling (90th %ile)"
                              : name === "p50"
                              ? "Expected Median (50th %ile)"
                              : "Bearish Floor (10th %ile)",
                          ]}
                          labelFormatter={(label) => `Year ${label}`}
                          contentStyle={{
                            backgroundColor: "#fff",
                            borderRadius: "12px",
                            border: "1px solid #EDE7EB",
                            fontSize: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                          }}
                        />
                        {/* Target Line */}
                        {mcTarget > 0 && (
                          <ReferenceLine
                            y={mcTarget}
                            stroke="#FF3B30"
                            strokeDasharray="4 4"
                            label={{
                              value: `Target: ₹${(mcTarget / 100000).toFixed(0)}L`,
                              fill: "#FF3B30",
                              fontSize: 10,
                              position: "top",
                            }}
                          />
                        )}
                        <Area type="monotone" dataKey="p90" stroke="#10B981" fillOpacity={1} fill="url(#bandGradient)" strokeWidth={1.5} />
                        <Area type="monotone" dataKey="p50" stroke="#059669" fillOpacity={0} strokeWidth={2.5} />
                        <Area type="monotone" dataKey="p10" stroke="#34D399" fillOpacity={0} strokeWidth={1.5} strokeDasharray="3 3" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-text-muted">
                      Running simulation...
                    </div>
                  )}
                </div>

                {/* Key Summary Percentiles */}
                {mcResult?.terminal_metrics && (
                  <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-[#EDE7EB]">
                    <div className="p-3 rounded-xl bg-[#FAF7F9] border border-[#EDE7EB] text-center">
                      <span className="text-[0.68rem] text-text-muted block">10th %ile (Bearish Floor)</span>
                      <span className="text-base font-bold text-text-primary font-mono mt-0.5 block">
                        {money(mcResult.terminal_metrics.p10_bearish)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-center">
                      <span className="text-[0.68rem] text-emerald-800 font-semibold block">50th %ile (Expected Median)</span>
                      <span className="text-lg font-bold text-emerald-800 font-mono mt-0.5 block">
                        {money(mcResult.terminal_metrics.p50_median)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FAF7F9] border border-[#EDE7EB] text-center">
                      <span className="text-[0.68rem] text-text-muted block">90th %ile (Bullish Ceiling)</span>
                      <span className="text-base font-bold text-brand-berry font-mono mt-0.5 block">
                        {money(mcResult.terminal_metrics.p90_bullish)}
                      </span>
                    </div>
                  </div>
                )}
              </Card>

              {/* Right Column: Simulation Parameters & Risk Metrics */}
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                    <Target size={16} className="text-brand-berry" /> Goal &amp; Simulation Parameters
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-text-secondary block mb-1">
                        Starting Portfolio Corpus (₹)
                      </label>
                      <input
                        type="number"
                        value={mcStarting}
                        onChange={(e) => setMcStarting(Number(e.target.value))}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-[#EDE7EB] bg-[#FAF7F9] font-mono focus:outline-none focus:border-brand-berry"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-text-secondary block mb-1">
                        Monthly Systematic Investment (SIP ₹)
                      </label>
                      <input
                        type="number"
                        value={mcSip}
                        onChange={(e) => setMcSip(Number(e.target.value))}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-[#EDE7EB] bg-[#FAF7F9] font-mono focus:outline-none focus:border-brand-berry"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium text-text-secondary mb-1">
                        <span>Horizon Duration:</span>
                        <span className="font-bold font-mono text-text-primary">{mcHorizon} Years</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="25"
                        value={mcHorizon}
                        onChange={(e) => setMcHorizon(Number(e.target.value))}
                        className="w-full accent-brand-berry h-1.5 bg-[#EDE7EB] rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-text-secondary block mb-1">
                        Financial Milestone Target (₹)
                      </label>
                      <input
                        type="number"
                        value={mcTarget}
                        onChange={(e) => setMcTarget(Number(e.target.value))}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-[#EDE7EB] bg-[#FAF7F9] font-mono focus:outline-none focus:border-brand-berry"
                      />
                    </div>

                    <Button
                      size="sm"
                      onClick={executeMonteCarlo}
                      disabled={loadingMc}
                      className="w-full text-xs py-2 mt-2"
                    >
                      {loadingMc ? "Simulating..." : "Re-Run 1,000 Paths"}
                    </Button>
                  </div>
                </Card>

                {/* Institutional Risk Metrics */}
                {mcResult && (
                  <Card className="p-6">
                    <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                      <Shield size={16} className="text-emerald-700" /> Institutional Risk &amp; Feasibility
                    </h3>

                    <div className="space-y-3.5">
                      {/* Goal Probability */}
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70 flex items-center justify-between">
                        <div>
                          <span className="text-[0.68rem] font-bold text-emerald-800 uppercase tracking-wide block">
                            Goal Probability ($P \ge \text{Target}$)
                          </span>
                          <span className="text-xs text-emerald-700 mt-0.5 block">
                            Chance of attaining {money(mcTarget)}
                          </span>
                        </div>
                        <span className="text-2xl font-bold font-mono text-emerald-800">
                          {mcResult.terminal_metrics.goal_success_probability}%
                        </span>
                      </div>

                      {/* 1-Yr VaR 95% */}
                      <div className="flex items-center justify-between py-2 border-b border-[#EDE7EB] text-xs">
                        <div>
                          <span className="font-semibold text-text-primary block">1-Year Value at Risk (VaR 95%)</span>
                          <span className="text-[0.68rem] text-text-muted">Maximum expected loss at 95% confidence</span>
                        </div>
                        <span className="font-mono font-bold text-rose-600">
                          -{mcResult.terminal_metrics.one_year_var_95}%
                        </span>
                      </div>

                      {/* Sharpe Ratio */}
                      <div className="flex items-center justify-between py-2 border-b border-[#EDE7EB] text-xs">
                        <div>
                          <span className="font-semibold text-text-primary block">Annualized Sharpe Ratio</span>
                          <span className="text-[0.68rem] text-text-muted">Excess return over 6.5% RBI repo benchmark</span>
                        </div>
                        <span className="font-mono font-bold text-text-primary">
                          {mcResult.sharpe_ratio}
                        </span>
                      </div>

                      {/* Portfolio Volatility */}
                      <div className="flex items-center justify-between py-2 text-xs">
                        <div>
                          <span className="font-semibold text-text-primary block">Portfolio Annual Volatility ($\sigma_p$)</span>
                          <span className="text-[0.68rem] text-text-muted">Derived from asset covariance matrix</span>
                        </div>
                        <span className="font-mono font-bold text-text-primary">
                          {mcResult.annual_volatility}%
                        </span>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SMART DYNAMIC REBALANCING (ADAPTIVE GLIDEPATH) */}
        {/* ========================================================= */}
        {activeTab === "rl-agent" && (
          <div className="space-y-8">
            {/* Live Benchmark Stream & Current Market Climate */}
            <LiveMarketPulse
              initialData={rlResult?.live_market}
              showLinkToLab={false}
              className="shadow-sm"
            />

            {/* Top Parameters Card */}
            <Card className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-[#EDE7EB]">
                <div>
                  <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <Compass size={18} className="text-brand-berry" /> Smart Dynamic Rebalancing (Adaptive Glidepath)
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Multi-year adaptive rebalancing engine that dynamically shifts between growth and capital protection, optimizing returns while safeguarding savings as your goal horizon nears.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent" className="font-mono text-[0.7rem]">
                    Dynamic Strategy Engine
                  </Badge>
                  <Badge tone="neutral" className="font-mono text-[0.7rem]">
                    Multi-Regime Adaptation
                  </Badge>
                  <Badge tone="neutral" className="font-mono text-[0.7rem]">
                    Long-Term Goal Optimized
                  </Badge>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Starting Capital */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                    Initial Portfolio (₹)
                  </label>
                  <input
                    type="number"
                    step="50000"
                    min="50000"
                    max="10000000"
                    value={rlStarting}
                    onChange={(e) => setRlStarting(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-[#EDE7EB] bg-[#FAF7F9] text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-berry/20 focus:border-brand-berry"
                  />
                </div>

                {/* Monthly SIP */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                    Monthly SIP (₹)
                  </label>
                  <input
                    type="number"
                    step="5000"
                    min="0"
                    max="500000"
                    value={rlSip}
                    onChange={(e) => setRlSip(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-[#EDE7EB] bg-[#FAF7F9] text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-berry/20 focus:border-brand-berry"
                  />
                </div>

                {/* Horizon */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-text-secondary">
                      Horizon: <span className="text-brand-berry font-bold">{rlHorizon} Years</span>
                    </label>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="20"
                    value={rlHorizon}
                    onChange={(e) => setRlHorizon(Number(e.target.value))}
                    className="w-full accent-brand-berry cursor-pointer mt-1"
                  />
                  <div className="flex justify-between text-[0.65rem] text-text-muted mt-1 font-mono">
                    <span>3 yrs</span>
                    <span>10 yrs</span>
                    <span>20 yrs</span>
                  </div>
                </div>

                {/* Risk Tolerance */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                    Objective Profile
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {["Conservative", "Balanced", "Aggressive"].map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setRlRiskTolerance(tier)}
                        className={`py-2 px-1 text-[0.7rem] font-semibold rounded-lg transition-all ${
                          rlRiskTolerance === tier
                            ? "bg-brand-berry text-white shadow-sm"
                            : "bg-[#FAF7F9] text-text-secondary hover:text-text-primary border border-[#EDE7EB]"
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action bar with current allocation status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-5 border-t border-[#EDE7EB]">
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <span>Current Base Mix:</span>
                  <span className="font-mono font-semibold text-text-primary">
                    {equity}% Equity · {debt}% Debt · {others}% Others
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={loadingRL ? RefreshCw : Play}
                  onClick={executeRLSimulation}
                  disabled={loadingRL}
                  className={loadingRL ? "animate-pulse" : ""}
                >
                  {loadingRL ? "Generating Strategy..." : "Generate Adaptive Strategy Plan"}
                </Button>
              </div>

              {rlError && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{rlError}</span>
                </div>
              )}
            </Card>

            {/* Simulation Results */}
            {rlResult && (
              <div className="space-y-8 animate-fadeIn">
                {/* Executive Summary Card */}
                <div className="p-5 bg-gradient-to-r from-[#FAF7F9] to-brand-cream/30 border border-[#EDE7EB] rounded-2xl relative overflow-hidden">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-brand-berry/10 rounded-xl text-brand-berry mt-0.5">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary mb-1 flex items-center gap-2">
                        Smart Strategy Synthesis
                        <Badge tone="accent" className="text-[0.65rem]">
                          Optimal Path Ready
                        </Badge>
                      </h3>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {rlResult.executive_summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Benchmark Comparison Cards (3 Strategies) */}
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Strategy 1: Adaptive Glidepath */}
                  <Card className="p-5 border-2 border-brand-berry/30 bg-gradient-to-b from-white to-[#FAF7F9] shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-brand-berry text-white text-[0.65rem] font-bold px-3 py-0.5 rounded-bl-lg tracking-wider uppercase">
                      Smart Dynamic Strategy
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-brand-berry mb-2">
                      <Award size={15} /> ClariFi Smart Glidepath
                    </div>
                    <div className="text-2xl font-black font-mono text-text-primary mb-1">
                      {money(rlResult.benchmarks.rl_agent.final_value)}
                    </div>
                    <div className="text-xs font-semibold text-emerald-600 mb-4 flex items-center gap-1 font-mono">
                      <ArrowUpRight size={14} /> +{rlResult.benchmarks.rl_agent.cumulative_return_pct}% Total Gain
                    </div>

                    <div className="space-y-2 pt-3 border-t border-[#EDE7EB] text-xs">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Sharpe Ratio</span>
                        <span className="font-mono font-bold text-text-primary">
                          {rlResult.benchmarks.rl_agent.sharpe_ratio}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Sortino Ratio</span>
                        <span className="font-mono font-bold text-emerald-600">
                          {rlResult.benchmarks.rl_agent.sortino_ratio}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Max Drawdown</span>
                        <span className="font-mono font-bold text-rose-600">
                          -{rlResult.benchmarks.rl_agent.max_drawdown_pct}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Compound CAGR</span>
                        <span className="font-mono font-semibold text-text-primary">
                          {rlResult.benchmarks.rl_agent.cagr_pct}%
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Strategy 2: Buy & Hold */}
                  <Card className="p-5 border border-[#EDE7EB]">
                    <div className="text-xs font-bold text-text-secondary mb-2 flex items-center gap-2">
                      <Compass size={15} /> Buy-and-Hold (Passive Drift)
                    </div>
                    <div className="text-2xl font-bold font-mono text-text-primary mb-1">
                      {money(rlResult.benchmarks.buy_and_hold.final_value)}
                    </div>
                    <div className="text-xs font-semibold text-emerald-600 mb-4 font-mono">
                      +{rlResult.benchmarks.buy_and_hold.cumulative_return_pct}% Total Gain
                    </div>

                    <div className="space-y-2 pt-3 border-t border-[#EDE7EB] text-xs">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Sharpe Ratio</span>
                        <span className="font-mono text-text-primary">
                          {rlResult.benchmarks.buy_and_hold.sharpe_ratio}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Sortino Ratio</span>
                        <span className="font-mono text-text-secondary">
                          {rlResult.benchmarks.buy_and_hold.sortino_ratio}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Max Drawdown</span>
                        <span className="font-mono text-rose-500">
                          -{rlResult.benchmarks.buy_and_hold.max_drawdown_pct}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Compound CAGR</span>
                        <span className="font-mono text-text-secondary">
                          {rlResult.benchmarks.buy_and_hold.cagr_pct}%
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Strategy 3: Fixed Rule 60/40 */}
                  <Card className="p-5 border border-[#EDE7EB]">
                    <div className="text-xs font-bold text-text-secondary mb-2 flex items-center gap-2">
                      <RotateCcw size={15} /> Fixed 60/40 Annual Rule
                    </div>
                    <div className="text-2xl font-bold font-mono text-text-primary mb-1">
                      {money(rlResult.benchmarks.fixed_60_40.final_value)}
                    </div>
                    <div className="text-xs font-semibold text-emerald-600 mb-4 font-mono">
                      +{rlResult.benchmarks.fixed_60_40.cumulative_return_pct}% Total Gain
                    </div>

                    <div className="space-y-2 pt-3 border-t border-[#EDE7EB] text-xs">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Sharpe Ratio</span>
                        <span className="font-mono text-text-primary">
                          {rlResult.benchmarks.fixed_60_40.sharpe_ratio}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Sortino Ratio</span>
                        <span className="font-mono text-text-secondary">
                          {rlResult.benchmarks.fixed_60_40.sortino_ratio}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Max Drawdown</span>
                        <span className="font-mono text-rose-500">
                          -{rlResult.benchmarks.fixed_60_40.max_drawdown_pct}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Compound CAGR</span>
                        <span className="font-mono text-text-secondary">
                          {rlResult.benchmarks.fixed_60_40.cagr_pct}%
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Wealth Trajectory Multi-Line Chart */}
                <Card className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                        <TrendingUp size={16} className="text-brand-berry" /> Strategy Wealth Trajectories
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Multi-year compounding across identical simulated market regimes.
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-brand-berry"></span>
                        <span className="text-text-primary font-bold">Smart Glidepath</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1 bg-slate-400"></span>
                        <span className="text-text-secondary">Buy &amp; Hold</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1 bg-amber-500"></span>
                        <span className="text-text-secondary">Fixed 60/40</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={rlResult.chart_data}
                        margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EBF0" vertical={false} />
                        <XAxis
                          dataKey="year"
                          tick={{ fontSize: 11, fill: "#8A7D87" }}
                          tickLine={false}
                          tickFormatter={(v) => `Yr ${v}`}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#8A7D87" }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-[#EDE7EB] shadow-lg text-xs space-y-1.5">
                                <span className="font-bold text-text-primary block border-b border-[#EDE7EB] pb-1">
                                  Year {label} Valuation
                                </span>
                                <div className="text-brand-berry font-bold flex justify-between gap-4">
                                  <span>Smart Glidepath:</span>
                                  <span className="font-mono">{money(payload[0]?.value)}</span>
                                </div>
                                <div className="text-slate-600 flex justify-between gap-4">
                                  <span>Buy &amp; Hold:</span>
                                  <span className="font-mono">{money(payload[1]?.value)}</span>
                                </div>
                                <div className="text-amber-600 flex justify-between gap-4">
                                  <span>Fixed 60/40:</span>
                                  <span className="font-mono">{money(payload[2]?.value)}</span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="rl_agent"
                          stroke="#4A154B"
                          strokeWidth={3}
                          dot={{ r: 3, fill: "#4A154B" }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="buy_and_hold"
                          stroke="#94A3B8"
                          strokeWidth={1.75}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="fixed_60_40"
                          stroke="#D97706"
                          strokeWidth={1.75}
                          strokeDasharray="3 3"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Dynamic Year-by-Year Glide-Path Timeline */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                        <Activity size={16} className="text-brand-berry" /> Dynamic Glidepath Timeline
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Year-by-year strategic shifts tailored to changing market conditions and your remaining investment horizon.
                      </p>
                    </div>
                    <Badge tone="accent" className="text-xs">
                      {rlResult.timeline.length} Decision Milestones
                    </Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#EDE7EB] text-text-secondary text-[0.7rem] uppercase tracking-wider font-semibold">
                          <th className="py-2.5 px-3">Year</th>
                          <th className="py-2.5 px-3">Market Climate</th>
                          <th className="py-2.5 px-3">Recommended Action</th>
                          <th className="py-2.5 px-3">Resulting Allocation</th>
                          <th className="py-2.5 px-3">Period Return</th>
                          <th className="py-2.5 px-3">Portfolio Value</th>
                          <th className="py-2.5 px-3">Strategic Rationale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EDE7EB]">
                        {rlResult.timeline.map((step) => {
                          const isBear = step.regime.includes("Bear");
                          const isBull = step.regime.includes("Bull");
                          const actionTone =
                            step.action === "HOLD"
                              ? "bg-slate-100 text-slate-700"
                              : step.action === "DEFENSIVE_GLIDE" || step.action === "PRESERVATION_EXIT"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700";

                          return (
                            <tr
                              key={step.year}
                              className={`transition-colors ${
                                step.is_live_market
                                  ? "bg-emerald-50/40 hover:bg-emerald-50/70 border-l-2 border-emerald-500"
                                  : "hover:bg-[#FAF7F9]/80"
                              }`}
                            >
                              <td className="py-3 px-3 font-mono font-bold text-text-primary whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span>Yr {step.year}</span>
                                  {step.is_live_market && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      LIVE
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[0.68rem] font-semibold ${
                                    isBear
                                      ? "bg-rose-100 text-rose-700"
                                      : isBull
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {step.regime}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-md font-mono text-[0.68rem] font-bold ${actionTone}`}>
                                  {step.action}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono text-text-secondary">
                                <span className="font-semibold text-text-primary">{step.equity_pct}% E</span> ·{" "}
                                {step.debt_pct}% D · {step.others_pct}% O
                              </td>
                              <td className="py-3 px-3 font-mono font-semibold">
                                <span className={step.period_return_pct >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                  {step.period_return_pct >= 0 ? "+" : ""}
                                  {step.period_return_pct}%
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-text-primary">
                                {money(step.portfolio_value)}
                              </td>
                              <td className="py-3 px-3 text-text-secondary text-[0.72rem] max-w-xs leading-relaxed">
                                {step.is_live_market ? (
                                  <div>
                                    <span className="font-bold text-emerald-800">[Live Market Feed]</span>{" "}
                                    {step.rationale.replace(/^\[Live Market\]\s*/, "")}
                                  </div>
                                ) : (
                                  step.rationale
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Bottom Row: Strategy Action Distribution & Action Playbook */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Action Distribution */}
                  <Card className="p-5">
                    <h3 className="text-xs font-bold text-text-primary mb-1 flex items-center gap-2">
                      <BarChart2 size={15} className="text-brand-berry" /> Strategy Action Distribution
                    </h3>
                    <p className="text-[0.7rem] text-text-secondary mb-4">
                      Frequency of tactical rebalancing moves across your investment horizon.
                    </p>

                    <div className="space-y-3">
                      {rlResult.action_distribution.map((item) => (
                        <div key={item.action}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-mono font-semibold text-text-primary">{item.action}</span>
                            <span className="font-mono text-text-secondary">
                              {item.count} yrs ({item.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#EDE7EB] h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-brand-berry h-full rounded-full transition-all duration-500"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Actions Catalog / Playbook */}
                  <Card className="p-5">
                    <h3 className="text-xs font-bold text-text-primary mb-1 flex items-center gap-2">
                      <Layers size={15} className="text-brand-berry" /> Strategic Action Playbook
                    </h3>
                    <p className="text-[0.7rem] text-text-secondary mb-3">
                      Rules and adjustments used by the strategy engine during different market cycles.
                    </p>

                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 text-xs">
                      {rlResult.actions_catalog.map((action) => (
                        <div key={action.id} className="p-2.5 rounded-xl bg-[#FAF7F9] border border-[#EDE7EB]">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-[0.68rem] font-bold text-brand-berry bg-brand-berry/10 px-1.5 py-0.5 rounded">
                              {action.name}
                            </span>
                            <span className="font-semibold text-text-primary text-[0.72rem]">{action.label}</span>
                          </div>
                          <p className="text-[0.68rem] text-text-secondary leading-normal">{action.description}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
