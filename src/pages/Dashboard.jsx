import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  MessageSquareText,
  ShieldCheck,
  Activity,
  FileSearch,
  ShieldAlert,
  Brain,
  Wallet,
  Gauge,
  Target,
} from "lucide-react";
import AppLayout from "../layouts/AppLayout";
import { Card, Disclaimer } from "../components/Basics";
import { StatCard, AssetMixCard } from "../components/FinancialCards";
import { RiskScoreCard } from "../components/RiskScore";
import { Skeleton } from "../components/States";
import Button from "../components/Button";
import { getPortfolio } from "../lib/api";
import { useAuth } from "../lib/auth";

const prompts = [
  "Explain a mutual fund prospectus",
  "Stress test my portfolio against 2008 crash",
  "Check a suspicious WhatsApp message",
  "Explain my uploaded financial document",
];

const tools = [
  {
    to: "/product-explainer",
    icon: FileSearch,
    title: "Product Explainer",
    body: "Upload documents to decode exclusions, fees, and fine print.",
    tone: "text-[#FF7A45]",
    tag: "RAG Citations",
  },
  {
    to: "/risk-simulator",
    icon: Activity,
    title: "Risk Simulator",
    body: "Model asset weights and replay historic market drawdowns.",
    tone: "text-[#D97706]",
    tag: "Deterministic",
  },
  {
    to: "/ml-lab",
    icon: Brain,
    title: "Strategy Lab",
    body: "Intelligent portfolio risk profiling, key driver diagnostics, and long-term wealth projections.",
    tone: "text-brand-berry",
    tag: "Strategy",
  },
  {
    to: "/scam-screener",
    icon: ShieldAlert,
    title: "Scam Screener",
    body: "Inspect unsolicited investment offers and detect fraud patterns.",
    tone: "text-[#FF3B30]",
    tag: "Security",
  },
];

const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    getPortfolio()
      .then((r) => !cancelled && setPortfolio(r.portfolio))
      .catch(() => !cancelled && setPortfolio(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = useMemo(() => user?.name?.trim().split(/\s+/)[0] || "", [user]);

  const submit = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(`/ask${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="mb-8">
          <p className="cf-eyebrow mb-2">CLARIFI INTELLIGENCE WORKSPACE</p>
          <h1 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-bold tracking-tight text-text-primary">
            {greeting()}
            {firstName && <>, {firstName}</>}.
          </h1>
          <p className="text-text-secondary mt-2 text-sm sm:text-base max-w-xl">
            Your financial picture — grounded in your actual holdings and indexed documents.
          </p>
        </div>

        {/* ── Ask ClariFi Omnibar ───────────────────────────── */}
        <form onSubmit={submit} className="mb-4">
          <div className="bg-white rounded-full p-2 pl-4 border border-[#EDE7EB] shadow-subtle flex items-center gap-3 transition-all focus-within:border-brand-berry focus-within:shadow-md">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about your money, documents, or allocations..."
              aria-label="Ask ClariFi"
              className="flex-1 min-w-0 px-2 py-2 outline-none bg-transparent text-sm sm:text-[0.95rem] text-text-primary placeholder:text-text-muted"
            />
            <button
              type="submit"
              aria-label="Ask ClariFi"
              className="w-10 h-10 shrink-0 rounded-full bg-brand-berry text-white flex items-center justify-center hover:bg-brand-berryDark active:scale-95 transition-all shadow-sm"
            >
              <ArrowRight size={17} strokeWidth={2.2} />
            </button>
          </div>
        </form>

        {/* Quick prompt suggestions */}
        <div className="flex flex-wrap gap-2 mb-10">
          {prompts.map((p) => (
            <button
              key={p}
              onClick={() => navigate(`/ask?q=${encodeURIComponent(p)}`)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary bg-[#FAF7F9] border border-[#EDE7EB] px-3.5 py-1.5 rounded-full hover:border-brand-berry hover:text-brand-berry hover:bg-brand-roseLight transition-all"
            >
              <MessageSquareText size={12} className="text-brand-berry" />
              {p}
            </button>
          ))}
        </div>

        {/* ── Portfolio State Section ──────────────────────── */}
        {loading ? (
          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : !portfolio ? (
          <Card sheen className="p-8 mb-10 bg-white border border-[#EDE7EB] shadow-subtle rounded-2xl">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="w-12 h-12 rounded-2xl bg-brand-roseLight border border-brand-roseBorder flex items-center justify-center shrink-0">
                <ShieldCheck className="text-brand-berry" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">
                  Connect your portfolio to activate intelligent insights.
                </h2>
                <p className="text-sm text-text-secondary mt-2 max-w-2xl leading-relaxed">
                  ClariFi deliberately avoids preloading synthetic or placeholder holdings. Enter your actual
                  asset-class breakdown in Portfolio Overview to enable deterministic risk analysis and the
                  historical stress-test simulator.
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <Button as={Link} to="/portfolio" variant="primary" icon={ArrowRight} iconPosition="right">
                    Configure holdings
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6 mb-10">
            <div className="grid sm:grid-cols-3 gap-4">
              <StatCard label="TOTAL PORTFOLIO" value={money(portfolio.value)} accent icon={Wallet} />
              <StatCard
                label="RISK SCORE"
                value={`${portfolio.riskScore} / 100`}
                sub={portfolio.riskLabel}
                icon={Gauge}
              />
              <StatCard
                label="FINANCIAL GOALS"
                value={`${portfolio.goals.onTrack} of ${portfolio.goals.total}`}
                sub="On track to milestone"
                icon={Target}
              />
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <RiskScoreCard portfolio={portfolio} />
              <AssetMixCard assetMix={portfolio.assetMix} />
            </div>
          </div>
        )}

        {/* ── Analytical Tool Suites ───────────────────────── */}
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-wider uppercase text-text-muted mb-4">
            Specialist Intelligence Modules
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {tools.map(({ to, icon: Icon, title, body, tone, tag }) => (
              <Link key={title} to={to} className="block group">
                <Card hover className="p-6 h-full bg-white border border-[#EDE7EB] shadow-subtle rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-roseLight border border-brand-roseBorder flex items-center justify-center">
                        <Icon className="text-brand-berry" size={18} strokeWidth={2} />
                      </div>
                      <span className="text-[0.7rem] font-semibold text-brand-berry px-2.5 py-0.5 rounded-full bg-brand-roseLight border border-brand-roseBorder">
                        {tag}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-1.5 group-hover:text-brand-berry transition-colors">
                      {title}
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed">{body}</p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-[#EDE7EB] flex items-center justify-between text-xs font-medium text-text-muted group-hover:text-brand-berry transition-colors">
                    <span>Launch specialist</span>
                    <ArrowRight size={13} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <Disclaimer className="mt-8 border-t border-[#EDE7EB] pt-6" />
      </div>
    </AppLayout>
  );
}
