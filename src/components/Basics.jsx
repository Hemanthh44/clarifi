import { ShieldCheck } from "lucide-react";

/**
 * Editorial Card:
 * Clean white/off-white surface, thin subtle border, minimal corner radius,
 * understated drop shadow. `sheen` adds the sunset gradient top hairline.
 */
export function Card({
  children,
  className = "",
  hover = false,
  sheen = false,
  as: Component = "div",
  ...props
}) {
  return (
    <Component
      className={`bg-white rounded-2xl border border-[#EDE7EB] shadow-subtle ${
        sheen ? "cf-glass-sheen overflow-hidden" : ""
      } ${hover ? "cf-hover-lift" : ""} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

/** A lighter container for nesting inside a Card or section */
export function Panel({ children, className = "", as: Component = "div", ...props }) {
  return (
    <Component
      className={`rounded-xl border border-[#EDE7EB] bg-[#FAF7F9] ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function Badge({ children, tone = "neutral", className = "" }) {
  const tones = {
    neutral: "bg-[#FAF7F9] text-text-secondary border-[#EDE7EB]",
    accent: "bg-brand-roseLight text-brand-berry border-brand-roseBorder",
    mint: "bg-brand-roseLight text-brand-berry border-brand-roseBorder",
    cyan: "bg-brand-roseLight text-brand-berry border-brand-roseBorder",
    positive: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    warning: "bg-amber-50 text-amber-800 border-amber-200/80",
    danger: "bg-rose-50 text-rose-800 border-rose-200/80",
    dark: "bg-[#181A2A] text-white border-[#181A2A]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-[0.72rem] font-sans font-medium whitespace-nowrap ${
        tones[tone] ?? tones.neutral
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function Avatar({ initials = "?", size = 36, className = "" }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-brand-berry text-white font-sans font-semibold shrink-0 shadow-sm ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

/** Page header used across authenticated screens, with editorial typography */
export function PageHeader({ eyebrow, title, description, icon: Icon, actions, className = "" }) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="flex gap-4 min-w-0">
        {Icon && (
          <div className="w-11 h-11 rounded-xl bg-brand-roseLight border border-brand-roseBorder flex items-center justify-center shrink-0 shadow-subtle mt-0.5">
            <Icon size={19} className="text-brand-berry" strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="cf-eyebrow mb-1">{eyebrow}</p>}
          <h1 className="cf-title text-[1.85rem] sm:text-[2.2rem] leading-tight text-text-primary">{title}</h1>
          {description && (
            <p className="text-sm text-text-secondary mt-1.5 max-w-2xl leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function ComplianceBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-[0.7rem] font-mono font-medium ${className}`}
    >
      <ShieldCheck size={12} className="text-emerald-700" /> Compliance Checked
    </span>
  );
}

export function Disclaimer({ className = "" }) {
  return (
    <p className={`text-[0.72rem] text-text-muted leading-relaxed font-sans ${className}`}>
      ClariFi provides educational and analytical information. It does not provide personalized investment advice or
      explicit buy/sell recommendations.
    </p>
  );
}
