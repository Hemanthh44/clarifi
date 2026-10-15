import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "./Basics";

const toneForScore = (score) => {
  if (score < 34) return { color: "#15803D", label: "Conservative", badgeBg: "bg-emerald-50 text-emerald-800" };
  if (score < 67) return { color: "#D97706", label: "Balanced", badgeBg: "bg-amber-50 text-amber-800" };
  return { color: "#FF3B30", label: "Aggressive", badgeBg: "bg-red-50 text-red-800" };
};

export function RiskOrb({ score, size = 140 }) {
  const { color } = toneForScore(score);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox="0 0 140 140" className="shrink-0">
      {/* Background track */}
      <circle cx="70" cy="70" r="54" fill="none" stroke="#EDE7EB" strokeWidth="8" />
      {/* Active score arc */}
      <circle
        cx="70"
        cy="70"
        r="54"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
      <text
        x="70"
        y="68"
        textAnchor="middle"
        fill="#181A2A"
        fontSize="30"
        fontWeight="700"
        fontFamily="Plus Jakarta Sans, -apple-system, sans-serif"
      >
        {score}
      </text>
      <text
        x="70"
        y="86"
        textAnchor="middle"
        fill="#7E8597"
        fontSize="9"
        fontWeight="600"
        fontFamily="JetBrains Mono, monospace"
        letterSpacing="0.8"
      >
        / 100
      </text>
    </svg>
  );
}

export function RiskBar({ label, value }) {
  const { color } = toneForScore(value);
  return (
    <div className="mb-3.5 last:mb-0">
      <div className="flex justify-between text-xs mb-1.5 font-sans">
        <span className="text-text-secondary font-medium">{label}</span>
        <span className="text-text-primary font-mono tabular">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#F4EFF3] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function RiskScoreCard({ portfolio }) {
  const [expanded, setExpanded] = useState(false);
  const { label, badgeBg } = toneForScore(portfolio.riskScore);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold tracking-wider uppercase text-text-muted">
          DETERMINISTIC RISK PROFILE
        </p>
        <span className={`text-xs font-semibold px-3 py-0.5 rounded-full border border-[#EDE7EB] ${badgeBg}`}>
          {label}
        </span>
      </div>

      <div className="flex items-center gap-6 mb-6">
        <RiskOrb score={portfolio.riskScore} />
        <div>
          <h3 className="text-2xl font-bold text-text-primary">{label} Risk</h3>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed max-w-xs">
            Calculated by ClariFi&apos;s deterministic risk engine from your exact asset weights.
          </p>
        </div>
      </div>

      <div className="space-y-1 mb-3 pt-3 border-t border-[#EDE7EB]">
        {portfolio.riskBreakdown.map((r) => (
          <RiskBar key={r.label} label={r.label} value={r.value} />
        ))}
      </div>

      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between text-xs font-semibold text-text-primary hover:text-brand-berry pt-4 border-t border-[#EDE7EB] transition-colors"
      >
        <span>Why this score?</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-4 rounded-xl border border-[#EDE7EB] bg-[#FAF7F9] p-4 animate-rise">
          <p className="text-xs font-semibold tracking-wider text-text-muted uppercase mb-3">
            RISK DRIVERS & FACTORS
          </p>
          <ul className="space-y-2 mb-3">
            {portfolio.riskFactors.map((f, i) => (
              <li key={i} className="flex gap-2 text-xs text-text-secondary leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-berry mt-1.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-muted font-mono">
            Deterministic calculation · Python risk engine
          </p>
        </div>
      )}
    </Card>
  );
}
