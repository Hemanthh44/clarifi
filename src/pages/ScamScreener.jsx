import { useState } from "react";
import { ShieldAlert, ScanSearch, RotateCcw, ShieldCheck, AlertCircle } from "lucide-react";
import AppLayout from "../layouts/AppLayout";
import { Card, Badge, Disclaimer } from "../components/Basics";
import Button from "../components/Button";
import { LoadingState } from "../components/States";
import {
  HighlightedMessage,
  RiskLevelBanner,
  RedFlagList,
  ExplainabilityDrawer,
  DualEngineScoreCard,
  TokenSalienceBadges,
} from "../components/ScamAnalyzer";
import { analyzeScamMessage } from "../lib/api";

export default function ScamScreener() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!message.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await analyzeScamMessage(message.trim());
      setResult({ ...data, message: message.trim() });
    } catch (err) {
      setError(err.message || "Unable to analyze this message.");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setMessage("");
    setResult(null);
    setError("");
  };

  const scorePct = Math.round((result?.score || 0) * 100);
  const isHigh = result?.risk_level?.includes("High");
  const isSuspicious = result?.risk_level?.includes("Suspicious");
  const toneColor = isHigh ? "text-[#FF3B30]" : isSuspicious ? "text-[#D97706]" : "text-emerald-700";
  const barBg = isHigh ? "bg-[#FF3B30]" : isSuspicious ? "bg-[#D97706]" : "bg-emerald-600";

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-brand-roseLight border border-brand-roseBorder shadow-subtle flex items-center justify-center shrink-0">
              <ShieldAlert size={20} className="text-brand-berry" strokeWidth={2} />
            </div>
            <div>
              <p className="cf-eyebrow mb-1">FRAUD INTELLIGENCE AGENT</p>
              <h1 className="text-3xl font-bold text-text-primary">Scam Screener</h1>
              <p className="text-sm text-text-secondary mt-1">
                Analytical inspection of suspicious financial solicitations before you act.
              </p>
            </div>
          </div>
          {message && (
            <button
              onClick={clear}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-brand-berry transition-colors pt-2"
            >
              <RotateCcw size={13} /> Clear text
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
          {/* Left: Input Console */}
          <Card className="p-6 bg-white border border-[#EDE7EB] shadow-subtle rounded-2xl h-fit">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-text-muted uppercase">
                  SOLICITATION TEXT
                </p>
                <p className="text-sm font-bold text-text-primary mt-0.5">
                  Paste verbatim message
                </p>
              </div>
              <Badge tone="accent">Pattern Analysis</Badge>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              placeholder="Paste a WhatsApp message, Telegram tip, SMS, guaranteed return email, or social media solicitation here..."
              className="w-full resize-none rounded-2xl border border-[#EDE7EB] bg-[#FAF7F9] p-4 outline-none text-sm text-text-primary placeholder:text-text-muted focus:border-brand-berry focus:bg-white transition-all leading-relaxed"
            />

            <div className="flex items-center justify-between mt-3 mb-5 font-mono text-[0.72rem] text-text-muted">
              <span>{message.length.toLocaleString()} characters</span>
              <span>Regulatory pattern match</span>
            </div>

            <Button
              icon={ScanSearch}
              onClick={analyze}
              disabled={loading || !message.trim()}
              className="w-full justify-center"
              size="lg"
            >
              {loading ? "Screening message..." : "Screen for fraud signals"}
            </Button>

            <Disclaimer className="mt-5 border-t border-[#EDE7EB] pt-4" />
          </Card>

          {/* Right: Analytical Inspection Output */}
          <div>
            {loading && (
              <Card className="p-8 bg-white border border-[#EDE7EB] shadow-subtle rounded-2xl">
                <LoadingState stage={2} />
              </Card>
            )}

            {!loading && !result && !error && (
              <Card className="p-10 min-h-[460px] flex flex-col items-center justify-center text-center bg-white border border-[#EDE7EB] shadow-subtle rounded-2xl">
                <div className="w-12 h-12 rounded-2xl bg-brand-roseLight border border-brand-roseBorder flex items-center justify-center mb-4">
                  <ShieldCheck size={24} className="text-brand-berry" strokeWidth={1.8} />
                </div>
                <h2 className="text-2xl font-bold text-text-primary">
                  Awaiting input to inspect
                </h2>
                <p className="text-xs text-text-secondary max-w-sm mt-2 leading-relaxed">
                  ClariFi verifies submitted text against registered entity databases, urgency-inducing
                  psychological hooks, and unrealistic yield promises.
                </p>
              </Card>
            )}

            {error && (
              <Card className="p-6 border border-red-200 bg-red-50 rounded-2xl text-red-900">
                <div className="flex gap-3">
                  <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="font-semibold text-xs font-mono uppercase">Screening error</p>
                    <p className="text-sm font-sans mt-1">{error}</p>
                  </div>
                </div>
              </Card>
            )}

            {result && (
              <Card className="p-6 bg-white border border-black/[0.08] shadow-subtle rounded-2xl animate-rise space-y-6">
                <RiskLevelBanner level={result.risk_level} />

                {/* Dual Engine Consensus Score */}
                {result.ml_analysis && (
                  <DualEngineScoreCard
                    ruleScore={result.score}
                    ruleLevel={result.risk_level}
                    mlAnalysis={result.ml_analysis}
                    ensembleScore={result.ensemble_score}
                  />
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-[#EDE7EB] bg-[#FAF7F9] p-4">
                    <p className="text-[0.68rem] font-mono font-semibold tracking-wider text-[#52586B] uppercase">
                      THREAT SEVERITY
                    </p>
                    <p className={`font-display text-3xl font-bold mt-2 tabular tracking-tight ${toneColor}`}>
                      {scorePct}
                      <span className="text-xs font-mono text-[#52586B]"> / 100</span>
                    </p>
                    <div className="h-1.5 bg-white border border-[#EDE7EB] rounded-full mt-3 overflow-hidden">
                      <div className={`h-full rounded-full ${barBg}`} style={{ width: `${scorePct}%` }} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#EDE7EB] bg-[#FAF7F9] p-4">
                    <p className="text-[0.68rem] font-mono font-semibold tracking-wider text-[#52586B] uppercase">
                      MATCHED PATTERNS
                    </p>
                    <p className="font-display text-3xl font-bold text-[#181A2A] mt-2 tracking-tight">
                      {result.flags?.length || 0}
                    </p>
                    <p className="text-xs font-mono text-[#52586B] mt-1">manipulation triggers</p>
                  </div>
                </div>

                <div>
                  <p className="text-[0.68rem] font-mono font-semibold tracking-wider text-text-muted uppercase mb-2">
                    VERBATIM ANNOTATION
                  </p>
                  <div className="rounded-xl bg-[#FAF8F5] border border-black/[0.06] p-4">
                    <HighlightedMessage message={result.message} flags={result.flags || []} />
                  </div>

                  {/* ML Token Salience Cloud */}
                  {result.ml_analysis?.top_tokens && (
                    <TokenSalienceBadges tokens={result.ml_analysis.top_tokens} />
                  )}
                </div>

                <div>
                  <RedFlagList flags={result.flags || []} />
                </div>

                <ExplainabilityDrawer title="Why was this flagged?">
                  <p className="text-sm text-text-secondary leading-relaxed bg-[#FAF8F5] border border-black/[0.05] rounded-xl p-4 font-sans">
                    {result.explanation}
                  </p>
                </ExplainabilityDrawer>

                <ExplainabilityDrawer title="Detection mechanics & rules">
                  <p className="text-xs text-text-secondary leading-relaxed font-mono p-2">
                    {result.detection_notes}
                  </p>
                </ExplainabilityDrawer>

                <div className="mt-6 pt-4 border-t border-black/[0.06] flex items-center justify-between">
                  <Badge tone="neutral">Compliance Screened</Badge>
                  <span className="text-[0.68rem] font-mono text-text-muted">
                    {result.compliance?.disclaimer || "Educational fraud signal scanner"}
                  </span>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
