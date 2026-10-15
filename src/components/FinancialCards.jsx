import { Card } from "./Basics";
import { assetColor } from "../lib/palette";

export function StatCard({ label, value, sub, accent = false, icon: Icon }) {
  return (
    <Card hover sheen={accent} className="p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold tracking-wider uppercase text-text-muted">
          {label}
        </p>
        {Icon && <Icon size={16} className="text-brand-berry shrink-0" strokeWidth={2} />}
      </div>
      <p
        className={`text-3xl font-bold tabular tracking-tight mt-3 ${
          accent ? "text-brand-berry" : "text-text-primary"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-text-secondary mt-1.5 font-medium">{sub}</p>}
    </Card>
  );
}

export function AssetMixCard({ assetMix }) {
  const mix = (assetMix || []).map((a, i) => ({ ...a, color: a.color || assetColor(i) }));

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold tracking-wider uppercase text-text-muted">
          ASSET ALLOCATION MIX
        </p>
        <span className="text-xs font-medium text-text-muted">100% Total</span>
      </div>

      <div className="flex h-2.5 rounded-full overflow-hidden mb-6 bg-[#F4EFF3]">
        {mix.map((a) => (
          <div
            key={a.label}
            style={{
              width: `${a.value}%`,
              backgroundColor: a.color,
            }}
            className="transition-all duration-500 ease-premium"
          />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {mix.map((a) => (
          <div key={a.label} className="p-3 rounded-xl border border-[#EDE7EB] bg-[#FAF7F9]">
            <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
              <span className="truncate font-medium">{a.label}</span>
            </div>
            <p className="text-xl font-bold text-text-primary tabular">{a.value}%</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
