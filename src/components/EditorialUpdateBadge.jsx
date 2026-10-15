/**
 * FernhillPillBadge / EditorialUpdateBadge
 *
 * Recreates the iconic pill badge from the top of the reference hero:
 * ● RCVS registered · Shrewsbury · Independent since 2009
 * Fitted for ClariFi: ● SEBI & Multi-Agent Grounded · Independent AI Since 2026
 */
export default function EditorialUpdateBadge({
  tag = "RCVS & SEBI Audited",
  message = "Independent Financial AI Since 2026",
  className = "",
}) {
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ECFDF5] border border-[#D1FAE5] shadow-xs ${className}`}>
      {/* Signature emerald dot */}
      <span className="w-2 h-2 rounded-full bg-[#047857] shrink-0 animate-pulse" />
      <span className="text-xs sm:text-[0.82rem] font-semibold text-[#047857] tracking-tight">
        {tag} <span className="opacity-50 mx-1">·</span> {message}
      </span>
    </div>
  );
}
