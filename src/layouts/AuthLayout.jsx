import { Link } from "react-router-dom";
import { ShieldCheck, Sparkles, LineChart } from "lucide-react";
import Logo from "../components/Logo";

const pillars = [
  { icon: Sparkles, label: "Multi-agent intelligence grounded directly in your documents" },
  { icon: LineChart, label: "Deterministic risk modeling with zero LLM hallucinations" },
  { icon: ShieldCheck, label: "Rigorous compliance guardrails on every generated answer" },
];

export default function AuthLayout({ children, side }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left side: Clean minimal authentication form */}
      <div className="flex flex-col px-6 sm:px-12 py-8 justify-between">
        <Link to="/" className="inline-flex w-fit hover:opacity-85 transition-opacity">
          <Logo size={28} />
        </Link>
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-[0.75rem] text-[#52586B]">
          © 2026 ClariFi. Financial intelligence and research software.
        </p>
      </div>

      {/* Right side: Modern Fernhill panel with ambient blush glow */}
      <div className="hidden lg:flex flex-col justify-center relative overflow-hidden border-l border-[#EDE7EB] px-16 bg-[#FAF7F9]">
        {/* Soft blush ambient glow */}
        <div
          className="editorial-hero-glow"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-roseLight border border-brand-roseBorder text-brand-berry text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-berry" />
            Independent Financial AI
          </div>

          <p className="font-display text-[2.2rem] font-bold text-[#181A2A] leading-[1.2] tracking-tight mb-4">
            &ldquo;{side.quote}&rdquo;
          </p>
          <p className="text-[#52586B] text-xs uppercase tracking-wider font-mono">
            — {side.attribution}
          </p>

          <div className="mt-12 space-y-3">
            {pillars.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="bg-white/95 backdrop-blur-sm border border-[#EDE7EB] rounded-2xl flex items-start gap-3.5 px-4 py-3.5 shadow-sm hover:border-brand-roseBorder transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-brand-roseLight border border-brand-roseBorder flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={14} className="text-brand-berry" strokeWidth={2} />
                </div>
                <p className="text-xs text-[#52586B] leading-relaxed font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
