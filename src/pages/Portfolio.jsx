import { useEffect, useState } from "react";
import { PieChart, Save, Sparkles, AlertCircle } from "lucide-react";
import AppLayout from "../layouts/AppLayout";
import { Card, Badge, Disclaimer } from "../components/Basics";
import { RiskScoreCard } from "../components/RiskScore";
import { getPortfolio, savePortfolio, generatePortfolioSummary } from "../lib/api";

const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function Portfolio() {
  const [p, setP] = useState(null);
  const [form, setForm] = useState({
    value: "",
    equity: "",
    debt: "",
    others: "",
    goals_on_track: "0",
    goals_total: "0",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const r = await getPortfolio();
      setP(r.portfolio);
      const a = r.portfolio.assetMix;
      setForm({
        value: r.portfolio.value,
        equity: a.find((x) => x.label === "Equity")?.value || 0,
        debt: a.find((x) => x.label === "Debt")?.value || 0,
        others: a.find((x) => x.label === "Others")?.value || 0,
        goals_on_track: r.portfolio.goals.onTrack,
        goals_total: r.portfolio.goals.total,
      });
    } catch (e) {
      if (!String(e.message).includes("404")) setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const total = Number(form.equity || 0) + Number(form.debt || 0) + Number(form.others || 0);

  const save = async () => {
    setError("");
    if (Number(form.value) <= 0) {
      setError("Please enter your current portfolio value.");
      return;
    }
    if (Math.abs(total - 100) > 0.01) {
      setError(`Asset allocation must sum to exactly 100%. Current total: ${total}%.`);
      return;
    }
    try {
      setSaving(true);
      const r = await savePortfolio({
        value: Number(form.value),
        equity: Number(form.equity),
        debt: Number(form.debt),
        others: Number(form.others),
        goals_on_track: Number(form.goals_on_track),
        goals_total: Number(form.goals_total),
      });
      setP(r.portfolio);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const summaryClick = async () => {
    try {
      setError("");
      setGeneratingSummary(true);
      const res = await generatePortfolioSummary();
      setSummary(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const field = (label, key, placeholder) => (
    <label className="block">
      <span className="block text-xs font-mono font-medium text-text-secondary uppercase mb-2">
        {label}
      </span>
      <input
        type="number"
        min="0"
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full cf-input px-3.5 py-2.5 text-sm font-mono text-text-primary outline-none"
      />
    </label>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-6 py-20 text-center font-mono text-sm text-text-muted">
          Loading wealth profile...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-brand-roseLight border border-brand-roseBorder shadow-subtle flex items-center justify-center shrink-0">
              <PieChart size={20} className="text-brand-berry" strokeWidth={2} />
            </div>
            <div>
              <p className="cf-eyebrow mb-1">PORTFOLIO INTELLIGENCE</p>
              <h1 className="text-3xl font-bold text-text-primary">Portfolio Overview</h1>
              <p className="text-sm text-text-secondary mt-1">
                Deterministic asset allocation breakdown, risk calibration, and milestone tracking.
              </p>
            </div>
          </div>
          {p && <Badge tone="positive">Holdings Verified</Badge>}
        </div>

        {!p && (
          <Card className="p-8 mb-8 bg-white border border-[#EDE7EB] shadow-subtle rounded-2xl">
            <h2 className="text-2xl font-bold text-text-primary">
              Connect your holdings
            </h2>
            <p className="text-sm text-text-secondary mt-2 max-w-2xl leading-relaxed">
              ClariFi contains no synthetic data. Enter your portfolio value and percentage allocations
              across Equity, Debt, and Others to unlock the deterministic risk engine and stress test machine.
            </p>
          </Card>
        )}

        {/* Input Form Card */}
        <Card className="p-6 sm:p-8 mb-8 bg-white border border-[#EDE7EB] shadow-subtle rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#EDE7EB] pb-4">
            <div>
              <p className="text-xs font-semibold tracking-wider text-text-muted uppercase">
                ALLOCATION CONFIGURATION
              </p>
              <h2 className="text-xl font-bold text-text-primary mt-0.5">
                Current Asset Weights
              </h2>
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-brand-berry text-white hover:bg-brand-berryDark transition-all px-5 py-2 text-xs font-semibold disabled:opacity-50 shadow-sm"
            >
              <Save size={14} />
              <span>{saving ? "Updating..." : "Save allocation"}</span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-5">
            {field("Total Portfolio Value (₹)", "value", "e.g. 1500000")}
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            {field("Equity Allocation (%)", "equity", "60")}
            {field("Debt / Fixed Income (%)", "debt", "30")}
            {field("Others / Gold / Cash (%)", "others", "10")}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-black/[0.06]">
            {field("Target Goals On Track", "goals_on_track", "3")}
            {field("Total Active Goals", "goals_total", "4")}
          </div>

          <div className="mt-5 flex items-center justify-between text-xs font-mono pt-3 border-t border-black/[0.06]">
            <span className="text-text-muted">Allocation sum:</span>
            <span className={`font-semibold ${Math.abs(total - 100) < 0.01 ? "text-emerald-700" : "text-[#FF3B30]"}`}>
              {total}% {Math.abs(total - 100) < 0.01 ? "(Valid 100%)" : "(Must equal 100%)"}
            </span>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-xs font-mono text-[#FF3B30] bg-red-50 p-3 rounded-xl border border-red-200">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}
        </Card>

        {/* Existing Portfolio Stats & Summaries */}
        {p && (
          <>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <Card className="p-6 bg-white border border-[#EDE7EB] shadow-sm rounded-2xl hover:border-brand-roseBorder transition-colors">
                <p className="text-[0.68rem] font-mono font-semibold tracking-wider text-[#52586B] uppercase">
                  TOTAL VALUE
                </p>
                <p className="font-display text-3xl font-bold text-[#181A2A] mt-2 tabular tracking-tight">
                  {money(p.value)}
                </p>
              </Card>

              <Card className="p-6 bg-white border border-[#EDE7EB] shadow-sm rounded-2xl hover:border-brand-roseBorder transition-colors">
                <p className="text-[0.68rem] font-mono font-semibold tracking-wider text-[#52586B] uppercase">
                  RISK CATEGORY
                </p>
                <p className="font-display text-3xl font-bold text-[#181A2A] mt-2 tracking-tight">
                  {p.riskLabel}
                </p>
                <p className="text-xs font-mono text-[#52586B] mt-1">{p.riskScore} / 100</p>
              </Card>

              <Card className="p-6 bg-white border border-[#EDE7EB] shadow-sm rounded-2xl hover:border-brand-roseBorder transition-colors">
                <p className="text-[0.68rem] font-mono font-semibold tracking-wider text-[#52586B] uppercase">
                  GOAL MILESTONES
                </p>
                <p className="font-display text-3xl font-bold text-[#181A2A] mt-2 tabular tracking-tight">
                  {p.goals.onTrack} / {p.goals.total}
                </p>
                <p className="text-xs font-mono text-emerald-700 mt-1 font-semibold">on target</p>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <RiskScoreCard portfolio={p} />

              <Card className="p-6 bg-white border border-[#EDE7EB] shadow-sm rounded-2xl">
                <p className="text-[0.68rem] font-mono font-semibold tracking-[0.16em] uppercase text-[#52586B] mb-4">
                  ASSET CLASS WEIGHTS
                </p>
                <div className="space-y-4">
                  {p.assetMix.map((a) => (
                    <div key={a.label}>
                      <div className="flex justify-between text-xs font-sans mb-1.5">
                        <span className="text-[#52586B] font-medium">{a.label}</span>
                        <span className="font-mono text-[#181A2A] font-semibold tabular">{a.value}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#FAF7F9] border border-[#EDE7EB] overflow-hidden">
                        <div
                          className="h-full bg-brand-berry rounded-full transition-all duration-500"
                          style={{ width: `${a.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-[#EDE7EB]">
                  <p className="text-[0.7rem] font-mono text-[#52586B]">
                    Last synchronized {new Date(p.updatedAt).toLocaleString()}
                  </p>
                </div>
              </Card>
            </div>

            {/* Portfolio Summary Agent */}
            <Card className="p-6 sm:p-8 bg-white border border-[#EDE7EB] shadow-sm rounded-2xl mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[0.68rem] font-mono font-semibold tracking-wider text-[#52586B] uppercase">
                    AI SYNTHESIS AGENT
                  </p>
                  <h2 className="font-display text-2xl font-bold text-[#181A2A] mt-0.5 tracking-tight">
                    Generate Analytical Overview
                  </h2>
                </div>
                <button
                  onClick={summaryClick}
                  disabled={generatingSummary}
                  className="inline-flex items-center gap-2 border border-[#EDE7EB] bg-white rounded-full px-5 py-2.5 text-xs font-medium text-[#181A2A] hover:bg-brand-roseLight hover:border-brand-roseBorder hover:text-brand-berry transition-all disabled:opacity-50 shadow-sm"
                >
                  <Sparkles size={14} className="text-brand-berry" />
                  <span>{generatingSummary ? "Synthesizing..." : "Generate briefing"}</span>
                </button>
              </div>

              {summary && (
                <div className="mt-6 rounded-2xl bg-[#FAF7F9] border border-[#EDE7EB] p-5 animate-rise">
                  <p className="font-display text-lg font-bold text-[#181A2A]">{summary.headline}</p>
                  <ul className="mt-3 space-y-2">
                    {summary.observations.map((x, i) => (
                      <li key={i} className="text-sm text-[#52586B] flex gap-2.5 font-sans leading-relaxed">
                        <span className="text-brand-berry font-mono">•</span>
                        <span>{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Disclaimer className="mt-6 border-t border-black/[0.06] pt-4" />
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
