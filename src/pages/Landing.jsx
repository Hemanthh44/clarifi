import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  FileSearch,
  Activity,
  PieChart,
  ShieldAlert,
  Play,
  X,
  Moon,
  CheckCircle2,
} from "lucide-react";
import Logo from "../components/Logo";
import Button from "../components/Button";
import { Card } from "../components/Basics";
import EditorialUpdateBadge from "../components/EditorialUpdateBadge";
import AgentNetwork from "../components/AgentNetwork";

const agents = [
  {
    id: "product-explainer",
    name: "Product Explainer",
    tagline: "Decode the fine print.",
    body: "Upload mutual fund factsheets, prospectuses, or insurance documents and receive plain-English analysis.",
    example: "What are the hidden exit loads, exclusions, and expense ratios?",
    icon: FileSearch,
  },
  {
    id: "risk-simulator",
    name: "Risk Simulator",
    tagline: "Model portfolio stress.",
    body: "Deterministic allocation risk calculation and replay against historic market shocks.",
    example: "Replay 2008 Lehman collapse or 2020 pandemic crash.",
    icon: Activity,
  },
  {
    id: "summary-agent",
    name: "Summary Agent",
    tagline: "See your financial picture.",
    body: "Synthesize asset allocation, diversification gaps, and target goal milestones into actionable briefings.",
    example: "Generate an analytical snapshot of my allocation.",
    icon: PieChart,
  },
  {
    id: "scam-screener",
    name: "Scam Screener",
    tagline: "Spot financial red flags.",
    body: "Detect high-yield fraud signals, urgent psychological manipulation, and unregistered advisory schemes.",
    example: "Inspect this WhatsApp guaranteed-returns offer.",
    icon: ShieldAlert,
  },
];

function Nav() {
  return (
    <header className="max-w-7xl mx-auto flex items-center justify-between px-6 sm:px-10 py-6 relative z-20">
      <Link to="/" className="inline-flex items-center hover:opacity-90 transition-opacity">
        <Logo size={28} />
      </Link>

      <nav className="hidden lg:flex items-center gap-7 text-[0.88rem] font-medium text-[#52586B]">
        <a href="#agents" className="hover:text-[#181A2A] transition-colors">Specialists</a>
        <a href="#how" className="hover:text-[#181A2A] transition-colors">How it works</a>
        <a href="#compliance" className="hover:text-[#181A2A] transition-colors">Compliance</a>
        <a href="#fees" className="hover:text-[#181A2A] transition-colors">Fee guide</a>
      </nav>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Toggle theme"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#52586B] hover:text-[#181A2A] hover:bg-[#ECFDF5] transition-colors"
        >
          <Moon size={17} />
        </button>

        <Link
          to="/login"
          className="text-sm font-medium text-[#52586B] hover:text-[#181A2A] transition-colors hidden sm:block"
        >
          Sign in
        </Link>

        {/* Primary Fernhill-style emerald green pill button */}
        <Button
          as={Link}
          to="/dashboard"
          size="sm"
          variant="primary"
          className="!bg-[#047857] !text-white hover:!bg-[#065F46] shadow-sm"
        >
          Register your portfolio
        </Button>
      </div>
    </header>
  );
}

export default function Landing() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="bg-white min-h-screen text-[#181A2A] overflow-x-hidden relative font-sans">
      {/* ── Soft Emerald / Ambient Hero Wash at Top ── */}
      <div className="editorial-hero-glow" aria-hidden="true" />

      <Nav />

      {/* ── Hero Section (Faithfully Matching the Fernhill Reference Composition) ── */}
      <section className="relative pt-6 pb-20 max-w-6xl mx-auto px-6 sm:px-10 z-10 text-center">
        {/* Top Fernhill Pill Badge */}
        <div className="flex justify-center mb-7">
          <EditorialUpdateBadge
            tag="RCVS & SEBI Audited"
            message="Independent Financial AI Since 2026"
          />
        </div>

        {/* Giant Headline: 2 Lines Matching Fernhill's exact scale & bold balance */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.2rem] font-bold tracking-tight text-[#181A2A] leading-[1.12] mb-6 max-w-4xl mx-auto font-display">
          <span className="block text-[#181A2A]">Your investments should tell you</span>
          <span
            className="block mt-1 text-[#047857] bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] bg-clip-text"
            style={{
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "#047857",
            }}
          >
            what they will cost
          </span>
        </h1>

        {/* Crisp, Centered Subtitle */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#52586B] leading-relaxed mb-9 font-normal">
          An independent multi-agent intelligence practice for your wealth. Mutual funds, equities,
          insurance, and complex contracts—with our fee & risk guide published on this platform and
          a clear answer about who protects your money when markets move.
        </p>

        {/* CTA Group: Primary Emerald Pill + Secondary Outline Pill + Play Demo */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <Button
            as={Link}
            to="/dashboard"
            size="lg"
            variant="primary"
            icon={ArrowRight}
            iconPosition="right"
            className="!bg-[#047857] !text-white hover:!bg-[#065F46] shadow-sm"
          >
            Register your portfolio
          </Button>

          <Button
            as={Link}
            to="/product-explainer"
            size="lg"
            variant="secondary"
            className="!bg-white !text-[#181A2A] !border-[#DDD3D9] hover:!border-[#047857] hover:!bg-[#F0FDF4]"
          >
            See the fee guide
          </Button>

          {/* Circular Play / Watch Demo CTA */}
          <button
            type="button"
            onClick={() => setDemoOpen(true)}
            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-semibold text-[#181A2A] hover:text-[#047857] hover:bg-[#ECFDF5] transition-all group"
          >
            <span className="w-9 h-9 rounded-full bg-[#047857] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Play size={14} className="ml-0.5 fill-white text-white" />
            </span>
            <span className="text-[#181A2A]">Watch Demo</span>
          </button>
        </div>

        {/* Clean Hairline Divider */}
        <div className="w-full max-w-3xl mx-auto border-t border-[#EDE7EB] mb-12" />

        {/* ── 4-Column Stat Metric Row (Directly Matching Fernhill £46 / 24/7 / 4,100 / 16) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center mb-16">
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#181A2A] tracking-tight">₹0</p>
            <p className="text-xs sm:text-sm text-[#52586B] mt-1 font-medium">Consultation fee</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#181A2A] tracking-tight">24/7</p>
            <p className="text-xs sm:text-sm text-[#52586B] mt-1 font-medium">Cover arranged</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#181A2A] tracking-tight">4,100+</p>
            <p className="text-xs sm:text-sm text-[#52586B] mt-1 font-medium">Audited portfolios</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#181A2A] tracking-tight">16</p>
            <p className="text-xs sm:text-sm text-[#52586B] mt-1 font-medium">Deterministic models</p>
          </div>
        </div>

        {/* ── Large Hero Showcase Preview Card (Directly Matching Fernhill's Rounded Hero Card) ── */}
        <div className="max-w-5xl mx-auto rounded-[2.25rem] bg-gradient-to-b from-[#FDF8FA] to-white p-3 sm:p-5 border border-[#EDE7EB] shadow-xl">
          <div className="rounded-[1.75rem] bg-white border border-[#EDE7EB] overflow-hidden p-6 sm:p-10 text-left">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#EDE7EB]">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-brand-berry" />
                <span className="w-3 h-3 rounded-full bg-brand-rose" />
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Autonomous Multi-Agent Orchestration
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Live Grounded Co-pilot
              </span>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-center mt-8">
              <div>
                <p className="text-xs font-semibold text-brand-berry uppercase tracking-wider mb-2">
                  Deterministic Verification
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4 leading-snug">
                  Four dedicated specialists, zero hidden agendas.
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-6">
                  Every query dispatches to specialized domain models. Risk calculations run through
                  deterministic mathematical formulations, never generative guesses.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FAF7F9] text-text-primary border border-[#EDE7EB]">
                    Exit load auditor
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FAF7F9] text-text-primary border border-[#EDE7EB]">
                    Monte Carlo shock tester
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FAF7F9] text-text-primary border border-[#EDE7EB]">
                    Regulatory citation engine
                  </span>
                </div>
              </div>

              <div className="bg-[#FAF7F9] p-6 rounded-2xl border border-[#EDE7EB]">
                <AgentNetwork compact />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Specialists Section ── */}
      <section id="agents" className="max-w-7xl mx-auto px-6 sm:px-10 py-24 border-t border-[#EDE7EB] relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wider text-brand-berry uppercase mb-2">
              System Architecture
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
              Four specialized analytical minds.
            </h2>
          </div>
          <p className="text-sm text-text-secondary max-w-md leading-relaxed">
            Rather than relying on generic chat completions, ClariFi assigns dedicated domain models to each task.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {agents.map((a) => {
            const Icon = a.icon;
            return (
              <Card key={a.id} hover className="p-6 flex flex-col justify-between h-full bg-white border border-[#EDE7EB] shadow-subtle rounded-2xl">
                <div>
                  <div className="w-11 h-11 rounded-xl bg-brand-roseLight border border-brand-roseBorder flex items-center justify-center mb-6">
                    <Icon size={20} className="text-brand-berry" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-1">{a.name}</h3>
                  <p className="text-xs font-semibold text-brand-berry mb-3">{a.tagline}</p>
                  <p className="text-xs text-text-secondary leading-relaxed mb-6">{a.body}</p>
                </div>
                <div className="pt-4 border-t border-[#EDE7EB]">
                  <p className="text-[0.75rem] text-text-muted italic leading-relaxed">
                    &ldquo;{a.example}&rdquo;
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── How It Works Section ── */}
      <section id="how" className="max-w-7xl mx-auto px-6 sm:px-10 py-24 border-t border-[#EDE7EB] relative z-10">
        <div className="max-w-xl mb-16">
          <p className="text-xs font-semibold tracking-wider text-brand-berry uppercase mb-2">
            Intelligent Routing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Ask any question. The Orchestrator resolves the rest.
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "You submit in plain words",
              body: "Whether uploading an SIP document, describing a suspect advisory message, or querying portfolio drawdown, ask naturally.",
            },
            {
              step: "02",
              title: "Autonomous orchestration",
              body: "ClariFi's routing agent selects the exact specialist, extracts relevant document pages, and queries our deterministic risk engine.",
            },
            {
              step: "03",
              title: "Grounded, verifiable clarity",
              body: "You receive citation-backed, compliance-screened answers with highlighted evidence and zero speculative advice.",
            },
          ].map((s) => (
            <div key={s.step} className="p-7 rounded-2xl bg-white border border-[#EDE7EB] shadow-subtle hover:border-[#D8CCD3] transition-all">
              <span className="text-xs font-bold text-brand-berry block mb-4">
                [{s.step}]
              </span>
              <h3 className="text-xl font-bold text-text-primary mb-2.5">{s.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Compliance & Integrity Section ── */}
      <section id="compliance" className="max-w-7xl mx-auto px-6 sm:px-10 py-24 border-t border-[#EDE7EB] relative z-10">
        <div className="grid lg:grid-cols-[0.9fr,1.1fr] gap-14 items-start">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-4">
              <CheckCircle2 size={13} className="text-emerald-700" /> Compliance Audited
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary max-w-md leading-tight">
              Explainability is our core architecture requirement.
            </h2>
            <p className="text-sm text-text-secondary mt-4 leading-relaxed">
              Financial software demands rigorous verification. Every calculation is deterministic, and every answer
              remains traceable to its underlying source.
            </p>
          </div>

          <div className="space-y-5">
            {[
              {
                title: "Source-grounded retrieval",
                body: "Every factual assertion references specific pages and sections from documents in your private knowledge library.",
              },
              {
                title: "Deterministic Python calculations",
                body: "Risk metrics, asset weights, and historical shock simulations are executed by deterministic math — never LLM hallucination.",
              },
              {
                title: "Fiduciary guardrails",
                body: "ClariFi operates strictly as an educational and analytical instrument. We never issue buy, sell, or commission-seeking recommendations.",
              },
            ].map((b) => (
              <div key={b.title} className="p-6 rounded-2xl bg-white border border-[#EDE7EB] shadow-subtle flex gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-berry mt-2 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-1">{b.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{b.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final Fernhill CTA ── */}
      <section id="fees" className="max-w-7xl mx-auto px-6 sm:px-10 pb-24 relative z-10">
        <div className="relative rounded-[2.5rem] bg-brand-berry text-white p-10 sm:p-16 lg:p-20 overflow-hidden shadow-xl">
          {/* Internal ambient rose glow */}
          <div
            className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-brand-rose/40 filter blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-24 -left-12 w-80 h-80 rounded-full bg-brand-coral/30 filter blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-2xl">
            <span className="text-xs uppercase font-bold tracking-widest text-brand-roseLight block mb-3">
              YOUR FINANCIAL INTELLIGENCE PRACTICE
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold leading-tight mb-5 text-white">
              Ready to see your investments with complete clarity?
            </h2>
            <p className="text-sm sm:text-base text-[#F5E2EC] leading-relaxed mb-8 max-w-lg">
              Connect your asset allocation, upload fund prospectuses, and verify suspicious offers today with zero hidden costs.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                as={Link}
                to="/dashboard"
                size="lg"
                className="bg-white text-brand-berry hover:bg-[#FAF7F9] shadow-md font-semibold"
                icon={ArrowRight}
                iconPosition="right"
              >
                Register your portfolio
              </Button>
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white underline underline-offset-4"
              >
                Create free account →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="max-w-7xl mx-auto px-6 sm:px-10 py-10 border-t border-[#EDE7EB] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted relative z-10">
        <div className="flex items-center gap-3">
          <Logo size={22} withWordmark={false} />
          <span className="font-semibold text-text-primary">ClariFi</span>
          <span>© 2026 ClariFi · Independent Financial Intelligence Practice</span>
        </div>
        <p className="text-center sm:text-right">
          Educational & analytical tool. Not a registered investment adviser.
        </p>
      </footer>

      {/* ── Demo Modal ── */}
      {demoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#EDE7EB] relative">
            <button
              onClick={() => setDemoOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FAF7F9] hover:bg-brand-roseLight flex items-center justify-center text-text-secondary hover:text-brand-berry transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-berry" />
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-berry">
                ClariFi Platform Walkthrough
              </p>
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-3">
              How ClariFi Protects Your Portfolio
            </h3>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              Watch how our multi-agent pipeline extracts hidden loads from PDFs, scores portfolio stress, and detects predatory advisory scams.
            </p>
            <div className="rounded-2xl bg-[#181A2A] text-white p-6 mb-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10 text-xs font-mono text-white/70">
                <span>SIMULATED WORKFLOW</span>
                <span className="text-emerald-400">STATUS: AUDITED</span>
              </div>
              <p className="text-sm font-mono text-emerald-300 mb-2">
                &gt; Analyzing HDFC Top 100 Factsheet...
              </p>
              <p className="text-xs font-mono text-white/80 mb-2">
                • TER: 1.62% (Higher than category average by 34 bps)
              </p>
              <p className="text-xs font-mono text-white/80 mb-4">
                • Exit Load: 1% if redeemed within 365 days
              </p>
              <p className="text-xs font-mono text-amber-300">
                &gt; Recommendation: Switch to Direct Plan saves ₹14,200/yr
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDemoOpen(false)}>
                Close
              </Button>
              <Button as={Link} to="/dashboard" variant="primary">
                Try It Live →
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
