import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getMarketLivePulse } from "../lib/api";

const formatMoney = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatPoints = (n) =>
  (Number(n) > 0 ? "+" : "") +
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function LiveMarketPulse({
  compact = false,
  showLinkToLab = true,
  className = "",
  initialData = null,
}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  const fetchPulse = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else if (!data) setLoading(true);
    setErrorMsg(null);

    try {
      const res = await getMarketLivePulse();
      setData(res);
      setLastFetchedAt(new Date());
    } catch (err) {
      console.warn("Failed to fetch live market pulse, using cached/fallback:", err);
      setErrorMsg("Unable to stream live quotes. Displaying cached indicators.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    if (!initialData) {
      fetchPulse();
    } else {
      setLastFetchedAt(new Date());
    }
    // Periodic refresh every 3 minutes
    const interval = setInterval(() => fetchPulse(), 180000);
    return () => clearInterval(interval);
  }, [fetchPulse, initialData]);

  if (loading && !data) {
    return (
      <div className={`p-5 rounded-2xl border border-[#EDE7EB] bg-white shadow-subtle ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-40 bg-slate-200 animate-pulse rounded-md" />
          <div className="h-4 w-24 bg-slate-200 animate-pulse rounded-full" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.indices) {
    return null;
  }

  const { indices, regime } = data;
  const nifty = indices.nifty50;
  const sensex = indices.sensex;
  const vix = indices.vix;
  const gold = indices.gold;

  const isLive = data.status === "live";
  const isBear = regime?.id === 0 || regime?.name?.toLowerCase().includes("bear");
  const isBull = regime?.id === 2 || regime?.name?.toLowerCase().includes("bull");

  const regimeBadgeColor = isBear
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : isBull
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-800 border-amber-200";

  // Volatility status descriptor
  const vixLevel = vix?.price || 15;
  const vixLabel =
    vixLevel < 14
      ? "Subdued Volatility"
      : vixLevel < 18
      ? "Normal Volatility"
      : vixLevel < 24
      ? "Elevated Volatility"
      : "High Fear / Stress";

  return (
    <div
      className={`rounded-2xl border border-[#EDE7EB] bg-white shadow-subtle cf-glass-sheen overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* ── Top Header / Live Badge Bar ──────────────────────── */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-white via-[#FAF7F9] to-white border-b border-[#EDE7EB] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isLive ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isLive ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </span>
          <span className="text-xs font-bold tracking-wider uppercase text-text-primary flex items-center gap-1.5">
            LIVE MARKET PULSE
          </span>
          <span
            className={`text-[0.65rem] font-semibold px-2 py-0.5 rounded-full border ${
              isLive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {isLive ? "Live Stream" : "Cached Fallback"}
          </span>
          <span className="text-[0.7rem] text-text-muted hidden sm:inline">
            · {lastFetchedAt ? `Synced ${lastFetchedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Indian Benchmarks"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Market Regime Pill */}
          {regime && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${regimeBadgeColor}`}
            >
              {isBear ? (
                <ShieldAlert size={13} className="shrink-0" />
              ) : isBull ? (
                <ShieldCheck size={13} className="shrink-0" />
              ) : (
                <Activity size={13} className="shrink-0" />
              )}
              <span>{regime.name}</span>
            </span>
          )}

          {/* Technicals toggle */}
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            aria-label="Toggle market technical details"
            className="text-xs font-medium text-text-secondary hover:text-brand-berry px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1 border border-transparent hover:border-[#EDE7EB]"
          >
            <span className="hidden md:inline">Technical Regime</span>
            {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchPulse(true)}
            disabled={refreshing}
            title="Refresh live benchmark quotes"
            className="w-7 h-7 rounded-lg border border-[#EDE7EB] bg-white flex items-center justify-center text-text-muted hover:text-brand-berry hover:border-brand-berry transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin text-brand-berry" : ""} />
          </button>
        </div>
      </div>

      {/* Error / Fallback Notice */}
      {errorMsg && (
        <div className="px-5 py-2 bg-amber-50 text-amber-800 text-xs border-b border-amber-200 flex items-center gap-2">
          <Info size={14} className="shrink-0 text-amber-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── 4 Benchmark Indices Grid ──────────────────────────── */}
      <div className="p-4 sm:p-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. NIFTY 50 */}
        {nifty && (
          <div className="p-3.5 rounded-xl border border-[#EDE7EB] bg-[#FAF7F9]/80 hover:bg-[#FAF7F9] hover:border-brand-berry/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[0.72rem] font-bold text-text-secondary tracking-wide">
                NIFTY 50
              </span>
              <span className="text-[0.65rem] font-mono font-medium text-text-muted">
                NSE
              </span>
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-text-primary tracking-tight">
              {formatMoney(nifty.price)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono text-[0.68rem] font-bold ${
                  nifty.change_pct >= 0
                    ? "bg-emerald-100/80 text-emerald-800"
                    : "bg-rose-100/80 text-rose-800"
                }`}
              >
                {nifty.change_pct >= 0 ? (
                  <TrendingUp size={11} className="shrink-0" />
                ) : (
                  <TrendingDown size={11} className="shrink-0" />
                )}
                <span>
                  {nifty.change_pct >= 0 ? "+" : ""}
                  {nifty.change_pct}%
                </span>
              </span>
              <span className="text-[0.68rem] font-mono text-text-muted">
                {formatPoints(nifty.change)}
              </span>
            </div>
          </div>
        )}

        {/* 2. BSE SENSEX */}
        {sensex && (
          <div className="p-3.5 rounded-xl border border-[#EDE7EB] bg-[#FAF7F9]/80 hover:bg-[#FAF7F9] hover:border-brand-berry/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[0.72rem] font-bold text-text-secondary tracking-wide">
                BSE SENSEX
              </span>
              <span className="text-[0.65rem] font-mono font-medium text-text-muted">
                BSE 30
              </span>
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-text-primary tracking-tight">
              {formatMoney(sensex.price)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono text-[0.68rem] font-bold ${
                  sensex.change_pct >= 0
                    ? "bg-emerald-100/80 text-emerald-800"
                    : "bg-rose-100/80 text-rose-800"
                }`}
              >
                {sensex.change_pct >= 0 ? (
                  <TrendingUp size={11} className="shrink-0" />
                ) : (
                  <TrendingDown size={11} className="shrink-0" />
                )}
                <span>
                  {sensex.change_pct >= 0 ? "+" : ""}
                  {sensex.change_pct}%
                </span>
              </span>
              <span className="text-[0.68rem] font-mono text-text-muted">
                {formatPoints(sensex.change)}
              </span>
            </div>
          </div>
        )}

        {/* 3. INDIA VIX */}
        {vix && (
          <div className="p-3.5 rounded-xl border border-[#EDE7EB] bg-[#FAF7F9]/80 hover:bg-[#FAF7F9] hover:border-brand-berry/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[0.72rem] font-bold text-text-secondary tracking-wide">
                INDIA VIX
              </span>
              <span className="text-[0.65rem] font-mono font-medium text-text-muted">
                Volatility
              </span>
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-text-primary tracking-tight">
              {Number(vix.price).toFixed(2)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono text-[0.68rem] font-bold ${
                  vix.change_pct <= 0
                    ? "bg-emerald-100/80 text-emerald-800"
                    : "bg-amber-100/80 text-amber-800"
                }`}
              >
                <span>{vix.change_pct >= 0 ? "+" : ""}{vix.change_pct}%</span>
              </span>
              <span className="text-[0.65rem] font-medium text-text-secondary truncate max-w-[85px]" title={vixLabel}>
                {vixLabel}
              </span>
            </div>
          </div>
        )}

        {/* 4. GOLD ETF */}
        {gold && (
          <div className="p-3.5 rounded-xl border border-[#EDE7EB] bg-[#FAF7F9]/80 hover:bg-[#FAF7F9] hover:border-brand-berry/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[0.72rem] font-bold text-text-secondary tracking-wide">
                GOLD BEES
              </span>
              <span className="text-[0.65rem] font-mono font-medium text-text-muted">
                Hedge / ETF
              </span>
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-text-primary tracking-tight">
              ₹{Number(gold.price).toFixed(2)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono text-[0.68rem] font-bold ${
                  gold.change_pct >= 0
                    ? "bg-emerald-100/80 text-emerald-800"
                    : "bg-rose-100/80 text-rose-800"
                }`}
              >
                <span>
                  {gold.change_pct >= 0 ? "+" : ""}
                  {gold.change_pct}%
                </span>
              </span>
              <span className="text-[0.68rem] font-mono text-text-muted">
                {formatPoints(gold.change)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Expandable Technical Indicators Drawer ───────────── */}
      {showDetails && nifty && (
        <div className="px-5 py-3.5 bg-[#FAF7F9] border-t border-[#EDE7EB] text-xs animate-fadeIn">
          <div className="flex items-center gap-2 mb-2 font-semibold text-text-primary">
            <Info size={13} className="text-brand-berry shrink-0" />
            <span>Technical Regime Criteria (NIFTY 50 SMAs &amp; Volatility)</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-text-secondary">
            <div className="bg-white p-2.5 rounded-lg border border-[#EDE7EB]">
              <div className="text-[0.68rem] text-text-muted uppercase font-bold">50-Day Moving Average</div>
              <div className="font-mono font-bold text-text-primary mt-0.5">
                {nifty.sma_50 ? formatMoney(nifty.sma_50) : "Calculating..."}
              </div>
              <div className="text-[0.68rem] mt-0.5">
                {nifty.price >= nifty.sma_50 ? (
                  <span className="text-emerald-600 font-semibold">Above 50 SMA (Bullish)</span>
                ) : (
                  <span className="text-rose-600 font-semibold">Below 50 SMA (Weakness)</span>
                )}
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-[#EDE7EB]">
              <div className="text-[0.68rem] text-text-muted uppercase font-bold">200-Day Moving Average</div>
              <div className="font-mono font-bold text-text-primary mt-0.5">
                {nifty.sma_200 ? formatMoney(nifty.sma_200) : "Calculating..."}
              </div>
              <div className="text-[0.68rem] mt-0.5">
                {nifty.price >= nifty.sma_200 ? (
                  <span className="text-emerald-600 font-semibold">Above Long-Term Trend</span>
                ) : (
                  <span className="text-rose-600 font-semibold">Below 200 SMA (Correction)</span>
                )}
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-[#EDE7EB]">
              <div className="text-[0.68rem] text-text-muted uppercase font-bold">Regime Classification</div>
              <div className="font-semibold text-text-primary mt-0.5">{regime?.tag || regime?.name}</div>
              <div className="text-[0.68rem] mt-0.5 text-text-muted">
                Feeds Year 0 into ClariFi Strategy Engine
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Macro Regime Rationale & RL Policy Feed Footer ───── */}
      {!compact && regime?.rationale && (
        <div className="px-5 py-3 bg-[#FAF7F9]/60 border-t border-[#EDE7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2 text-text-secondary leading-relaxed">
            <span className="font-bold text-text-primary shrink-0">Strategy Feed:</span>
            <span>{regime.rationale}</span>
          </div>

          {showLinkToLab && (
            <Link
              to="/ml-lab"
              className="inline-flex items-center gap-1 font-semibold text-brand-berry hover:text-brand-berryDark shrink-0 transition-colors"
            >
              <span>Explore Strategy Lab</span>
              <ArrowRight size={13} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
