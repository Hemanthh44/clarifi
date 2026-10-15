import { useState } from "react";
import { Sparkles, ChevronDown, FileText, CheckCircle2 } from "lucide-react";
import { Card, ComplianceBadge } from "./Basics";

export function SourceCard({ source }) {
  const isWeb = source.source_type === "web" && source.url;

  const content = (
    <>
      <div className="flex items-center gap-2 mb-0.5">
        <FileText size={13} className="text-brand-berry shrink-0" />
        <span className="text-xs font-semibold text-text-primary truncate">
          {source.doc}
        </span>
      </div>
      <p className="text-[0.72rem] text-text-muted pl-5 truncate font-mono">
        {isWeb
          ? source.domain || "Web citation"
          : `Page ${source.page}${source.section ? ` · ${source.section}` : ""}`}
      </p>
    </>
  );

  if (isWeb) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="block p-3 rounded-xl border border-[#EDE7EB] bg-[#FAF7F9] hover:border-brand-berry hover:bg-white transition-all shadow-sm"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="block p-3 rounded-xl border border-[#EDE7EB] bg-[#FAF7F9]">
      {content}
    </div>
  );
}

export function UserBubble({ text }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[82%] bg-brand-berry text-white shadow-sm rounded-2xl rounded-tr-md px-5 py-3 text-[0.93rem] leading-relaxed font-medium">
        {text}
      </div>
    </div>
  );
}

export function RetrievalTrail({ steps }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[#EDE7EB] pt-3 mt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-brand-berry transition-colors"
      >
        <span>Sources & agent verification trail</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 animate-rise">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="text-[0.68rem] px-2.5 py-1 rounded-md bg-[#FAF7F9] border border-[#EDE7EB] text-text-secondary font-mono">
                {s}
              </span>
              {i < steps.length - 1 && <span className="text-text-muted text-xs">→</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AnswerMessage({ data }) {
  return (
    <div className="flex gap-3 max-w-[94%]">
      <div className="w-8 h-8 rounded-full bg-brand-roseLight border border-brand-roseBorder text-brand-berry flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        <Sparkles size={14} className="text-brand-berry" />
      </div>
      <Card className="p-6 flex-1 bg-white border border-[#EDE7EB] shadow-subtle rounded-2xl">
        <div className="flex items-center justify-between mb-4 border-b border-[#EDE7EB] pb-3">
          <p className="text-xs font-semibold tracking-wider text-brand-berry uppercase">
            CLARIFI SYNTHESIS
          </p>
          <div className="flex items-center gap-2">
            {data.evidenceStrength && (
              <span
                className={`text-[0.68rem] font-semibold tracking-wide px-2.5 py-0.5 rounded-full border ${
                  data.evidenceStrength === "High"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : data.evidenceStrength === "Medium"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                {data.evidenceStrength.toUpperCase()} EVIDENCE
              </span>
            )}
            <ComplianceBadge />
          </div>
        </div>

        {/* Core answer */}
        <p className="text-[0.98rem] text-text-primary leading-relaxed mb-4">
          {data.answer}
        </p>

        {data.explanation && (
          <p className="text-sm text-text-secondary leading-relaxed mb-5 bg-[#FAF7F9] p-3.5 rounded-xl border border-[#EDE7EB]">
            {data.explanation}
          </p>
        )}

        {data.keyTakeaways?.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold tracking-wider uppercase text-text-muted mb-2.5">
              KEY OBSERVATIONS
            </p>
            <ul className="space-y-2">
              {data.keyTakeaways.map((point, i) => (
                <li key={i} className="flex gap-3 text-sm text-text-secondary leading-relaxed">
                  <span className="text-brand-berry font-mono font-bold text-xs shrink-0 mt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.whyItMatters && (
          <div className="mb-5 rounded-xl bg-[#FAF7F9] border border-[#EDE7EB] p-4">
            <p className="text-xs font-semibold tracking-wider uppercase text-text-muted mb-1.5">
              WHY IT MATTERS
            </p>
            <p className="text-sm text-text-secondary leading-relaxed">{data.whyItMatters}</p>
          </div>
        )}

        {data.risks?.length > 0 && (
          <div className="mb-5 p-4 rounded-xl border border-rose-200 bg-rose-50/60">
            <p className="text-xs font-semibold tracking-wider uppercase text-rose-800 mb-2">
              RISKS &amp; FINE PRINT LIMITATIONS
            </p>
            <ul className="space-y-1.5">
              {data.risks.map((r, i) => (
                <li key={i} className="flex gap-2.5 text-xs text-rose-900 leading-relaxed">
                  <span className="text-rose-600 shrink-0 font-bold">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.nextSteps?.length > 0 && (
          <div className="mb-5">
            <p className="text-[0.68rem] font-mono font-semibold tracking-[0.16em] uppercase text-text-muted mb-2">
              RECOMMENDED INQUIRIES
            </p>
            <ul className="space-y-1.5">
              {data.nextSteps.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-xs text-text-secondary leading-relaxed">
                  <span className="text-[#FF7A45] shrink-0 font-mono">→</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.sources?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-black/[0.06]">
            <p className="text-[0.68rem] font-mono font-semibold tracking-[0.16em] uppercase text-text-muted mb-2.5">
              PRIMARY CITATIONS &amp; GROUNDING
            </p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {data.sources.map((s, i) => (
                <SourceCard key={i} source={s} />
              ))}
            </div>
          </div>
        )}

        {data.retrievalTrail && <RetrievalTrail steps={data.retrievalTrail} />}
      </Card>
    </div>
  );
}

const activitySteps = [
  "Query intent classified",
  "Specialist agent routed",
  "Document vector retrieval completed",
  "Deterministic model calculated",
  "Compliance & explainability checked",
];

export function AgentActivityPanel({ done = true }) {
  return (
    <Card className="p-4 bg-white border border-black/[0.08] rounded-xl shadow-subtle">
      <p className="text-[0.68rem] font-mono font-semibold tracking-[0.16em] uppercase text-text-muted mb-3">
        AGENT ACTIVITY
      </p>
      <div className="space-y-2">
        {activitySteps.map((step) => (
          <div key={step} className="flex items-center gap-2.5 text-xs">
            <CheckCircle2 size={13} className={done ? "text-emerald-600" : "text-text-muted"} />
            <span className={done ? "text-text-secondary" : "text-text-muted font-mono"}>{step}</span>
          </div>
        ))}
      </div>
      {done && (
        <p className="text-xs font-mono font-medium text-emerald-700 mt-3 pt-3 border-t border-black/[0.06]">
          All verification steps passed
        </p>
      )}
    </Card>
  );
}
