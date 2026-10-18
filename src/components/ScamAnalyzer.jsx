import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";

export function HighlightedMessage({ message, flags }) {
  // Build segments by splitting on flagged spans
  const segments = [];
  const sorted = [...flags].sort((a, b) => message.indexOf(a.span) - message.indexOf(b.span));

  let cursor = 0;
  sorted.forEach((f) => {
    const idx = message.indexOf(f.span, cursor);
    if (idx === -1) return;
    if (idx > cursor) segments.push({ text: message.slice(cursor, idx), flagged: false });
    segments.push({ text: f.span, flagged: true, label: f.label });
    cursor = idx + f.span.length;
  });
  if (cursor < message.length) segments.push({ text: message.slice(cursor), flagged: false });

  return (
    <p className="text-sm text-text-primary leading-relaxed font-sans">
      {segments.map((seg, i) =>
        seg.flagged ? (
          <mark
            key={i}
            className="bg-red-100 text-red-900 border-b-2 border-red-500 rounded px-1 py-0.5 font-medium not-italic"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  );
}

export function RiskLevelBanner({ level }) {
  const isHigh = level.includes("High");
  const isSuspicious = level.includes("Suspicious");

  const containerClasses = isHigh
    ? "bg-rose-50 border-rose-200 text-rose-900"
    : isSuspicious
    ? "bg-amber-50 border-amber-200 text-amber-900"
    : "bg-emerald-50 border-emerald-200 text-emerald-900";

  const iconClasses = isHigh ? "text-rose-600" : isSuspicious ? "text-amber-600" : "text-emerald-600";

  return (
    <div className={`flex items-center gap-3.5 rounded-2xl border p-4 ${containerClasses}`}>
      <AlertTriangle size={20} className={iconClasses} />
      <div>
        <p className="text-xs font-semibold tracking-wider uppercase opacity-75">
          SECURITY ASSESSMENT
        </p>
        <p className="text-xl font-bold tracking-tight mt-0.5">
          {level}
        </p>
      </div>
    </div>
  );
}

export function RedFlagList({ flags }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wider uppercase text-text-muted mb-3">
        IDENTIFIED SIGNALS &amp; PATTERNS
      </p>
      <ul className="space-y-2.5">
        {flags.map((f, i) => (
          <li key={i} className="flex gap-3 text-sm text-text-primary items-start bg-[#FAF7F9] border border-[#EDE7EB] rounded-xl p-3">
            <span className="text-brand-berry font-mono font-bold text-xs shrink-0 mt-0.5">
              [{String(i + 1).padStart(2, "0")}]
            </span>
            <span className="font-medium text-text-secondary">{f.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExplainabilityDrawer({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[#EDE7EB] pt-3.5 mt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full text-xs font-semibold text-text-primary hover:text-brand-berry transition-colors"
      >
        <span>{title}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-3 animate-rise">{children}</div>}
    </div>
  );
}


export function TokenSalienceBadges({ tokens }) {
  if (!tokens || tokens.length === 0) return null;
  return (
    <div className="space-y-2 mt-4 pt-4 border-t border-[#EDE7EB]">
      <p className="text-[0.68rem] font-bold text-text-muted uppercase tracking-wider">
        Key Trigger Phrases &amp; Risk Signals
      </p>
      <div className="flex flex-wrap gap-2">
        {tokens.map((t, i) => {
          const isScam = t.type === "scam_trigger";
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border ${
                isScam
                  ? "bg-rose-50 text-rose-800 border-rose-200/80"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200/80"
              }`}
            >
              <span className="font-sans font-semibold text-text-primary">"{t.token}"</span>
              <span>{t.weight > 0 ? `+${t.weight}` : t.weight}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}


export function DualEngineScoreCard({ ruleScore, ruleLevel, mlAnalysis, ensembleScore }) {
  const mlScorePct = Math.round((mlAnalysis?.ml_score || 0) * 100);
  const ensemblePct = Math.round((ensembleScore ?? ruleScore) * 100);

  return (
    <div className="p-4 rounded-2xl bg-[#FAF7F9] border border-[#EDE7EB] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[0.68rem] font-bold text-brand-berry uppercase tracking-wide block">
            DUAL-LAYER FRAUD VERIFICATION
          </span>
          <span className="text-sm font-bold text-text-primary mt-0.5 block">
            Consensus Risk: {ensemblePct}% Risk Score
          </span>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-white border border-[#EDE7EB] font-bold text-text-primary shadow-xs">
          Combined: {ensemblePct}/100
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Engine 1 */}
        <div className="p-3 bg-white rounded-xl border border-[#EDE7EB]">
          <span className="text-[0.65rem] text-text-muted font-bold block uppercase tracking-wider">
            Layer 1: Regulatory Rules
          </span>
          <span className="font-semibold text-text-primary mt-1 block">
            {ruleLevel}
          </span>
          <span className="text-[0.68rem] text-text-muted font-mono block mt-0.5">
            Severity: {Math.round(ruleScore * 100)}%
          </span>
        </div>

        {/* Engine 2 */}
        <div className="p-3 bg-white rounded-xl border border-[#EDE7EB]">
          <span className="text-[0.65rem] text-brand-berry font-bold block uppercase tracking-wider">
            Layer 2: Phishing &amp; Language Scanner
          </span>
          <span className="font-semibold text-text-primary mt-1 block">
            {mlAnalysis?.ml_label || "Evaluating..."}
          </span>
          <span className="text-[0.68rem] text-text-muted font-mono block mt-0.5">
            Threat Likelihood: {mlScorePct}% ({mlAnalysis?.ml_confidence ? `${Math.round(mlAnalysis.ml_confidence * 100)}% conf` : ""})
          </span>
        </div>
      </div>
    </div>
  );
}

