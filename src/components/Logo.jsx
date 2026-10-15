export default function Logo({ size = 26, withWordmark = true, className = "" }) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Fernhill-inspired modern berry geometric mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Central core node */}
        <circle cx="16" cy="16" r="5" fill="#047857" />
        {/* 4 surrounding orbital petals / nodes creating the iconic flower-paw motif */}
        <circle cx="16" cy="6" r="3.2" fill="#10B981" />
        <circle cx="26" cy="16" r="3.2" fill="#059669" />
        <circle cx="16" cy="26" r="3.2" fill="#047857" />
        <circle cx="6" cy="16" r="3.2" fill="#10B981" />
        {/* Delicate inner light spark */}
        <circle cx="16" cy="16" r="1.8" fill="#FFFFFF" />
      </svg>

      {withWordmark && (
        <span className="font-sans text-[1.25rem] tracking-tight text-[#181A2A] font-bold">
          Clari<span className="text-[#047857] font-extrabold">Fi</span>
        </span>
      )}
    </div>
  );
}
