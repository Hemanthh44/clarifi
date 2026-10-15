export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-brand-roseLight border border-brand-roseBorder flex items-center justify-center mb-5 shadow-sm">
          <Icon size={24} className="text-brand-berry" strokeWidth={1.8} />
        </div>
      )}
      <h3 className="font-display text-2xl font-bold tracking-tight text-[#181A2A] mb-2">{title}</h3>
      <p className="text-[#52586B] text-sm max-w-sm mb-6 leading-relaxed">{description}</p>
      {action}
    </div>
  );
}

const stages = ["Selecting specialist...", "Retrieving evidence...", "Running analysis...", "Checking compliance..."];

export function LoadingState({ stage = 0 }) {
  return (
    <div className="flex items-center gap-3 text-[#52586B] text-xs font-mono py-3" role="status">
      <span className="flex gap-1" aria-hidden="true">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-berry animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-brand-rose animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-brand-berry animate-bounce" />
      </span>
      <span>{stages[stage] ?? stages[0]}</span>
    </div>
  );
}

/** Shimmer placeholder used while data loads */
export function Skeleton({ className = "" }) {
  return (
    <div
      className={`rounded-2xl bg-[#FAF7F9] border border-[#EDE7EB] overflow-hidden relative ${className}`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent, rgba(253, 242, 247, 0.9), transparent)",
          backgroundSize: "200% 100%",
        }}
      />
    </div>
  );
}
