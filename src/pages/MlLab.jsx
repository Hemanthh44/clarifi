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
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import AppLayout from "../layouts/AppLayout";
import { Card, Badge, PageHeader, Panel } from "../components/Basics";
import Button from "../components/Button";
import { predictRisk, rebalancePortfolio, runMonteCarlo, getPortfolio } from "../lib/api";

const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function MlLab() {
  const [activeTab, setActiveTab] = useState("risk-xai"); // 'risk-xai' | 'monte-carlo'

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
          eyebrow="QUANTITATIVE & STATISTICAL INTELLIGENCE"
          title="ML Intelligence & Quant Lab"
          description="Explainable machine learning risk classification, SHAP-style attribution, and stochastic Monte Carlo wealth simulation."
          icon={Brain}
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
            <Layers size={15} />
            ML Risk &amp; Explainable AI (XAI)
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
            Stochastic Monte Carlo Simulator (1,000 Paths)
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
                        <Sliders size={18} className="text-brand-berry" /> Feature Inputs
                      </h2>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Adjust parameters to evaluate live gradient-descent model inferences.
                      </p>
                    </div>
                    <Badge tone="accent" className="font-mono text-[0.7rem]">
                      4 Continuous Features
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
                        <Zap size={16} className="text-brand-berry" /> Target-Risk Rebalance Optimizer
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Computes the minimum Euclidean portfolio shift to land in your desired risk class.
                      </p>
                    </div>
                    <Badge tone="accent">L2 Optimization</Badge>
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
                          {rebalanceResult.confidence * 100}% Model Confidence
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
                      <p className="cf-eyebrow mb-1">MULTINOMIAL LOGISTIC MODEL</p>
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
                      <TableIcon size={13} /> View Metrics
                    </button>
                  </div>

                  {/* Softmax Probability Bars */}
                  <div className="space-y-2.5 mb-6">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Softmax Class Probabilities
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

                  {/* Explainable AI (XAI) Waterfall Feature Attribution */}
                  <div className="pt-5 border-t border-[#EDE7EB]">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                          <Sparkles size={14} className="text-brand-berry" /> Feature Attribution Waterfall (XAI)
                        </h4>
                        <p className="text-[0.68rem] text-text-muted">
                          Log-odds contribution $w_j \cdot z_j$ of each standardized feature to the decision.
                        </p>
                      </div>
                      <Badge tone="neutral" className="text-[0.65rem]">
                        SHAP-like Decomposition
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

            {/* Academic Model Defense Modal */}
            {showMetricsModal && prediction?.metrics && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                <Card className="max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Badge tone="accent">ACADEMIC DEFENSE &amp; MODEL METRICS</Badge>
                      <h3 className="text-lg font-bold text-text-primary mt-1">
                        Multinomial Logistic Regression Evaluation
                      </h3>
                      <p className="text-xs text-text-secondary">
                        Computed on a 20% held-out test split ($N = {prediction.metrics.test_set_size}$ samples).
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

                  {/* Confusion Matrix Table */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-text-primary mb-2">Test Confusion Matrix:</p>
                    <table className="w-full text-xs border border-[#EDE7EB] rounded-lg overflow-hidden text-center">
                      <thead className="bg-[#FAF7F9] text-text-muted text-[0.7rem]">
                        <tr>
                          <th className="p-2 text-left">Actual \ Predicted</th>
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
                    Mathematical Formulation: $\text{Softmax}(W^T x + b)$ trained with cross-entropy loss, gradient
                    descent $\alpha = 0.3$, and $L_2$ weight penalty $\lambda = 0.01$ over standardized continuous features.
                  </p>

                  <Button size="sm" onClick={() => setShowMetricsModal(false)} className="w-full text-xs">
                    Close Evaluation View
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
                      1,000 STOCHASTIC PATHS (GBM)
                    </Badge>
                    <h3 className="text-xl font-bold text-text-primary">Stochastic Wealth Projection</h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Visualizing 10th (Bearish), 50th (Expected Median), and 90th (Bullish) percentile boundaries.
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
      </div>
    </AppLayout>
  );
}
