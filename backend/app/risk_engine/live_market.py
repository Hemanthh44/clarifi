"""Live financial market data engine.

Fetches real-time market data for Indian benchmark indices (NIFTY 50, SENSEX,
India VIX, Gold) using HTTP quotes and computes the current live market regime
(Bear, Range-Bound, Bull Expansion) using 50-day/200-day SMAs and volatility.
Includes in-memory TTL caching and graceful fallback.
"""
from __future__ import annotations

import logging
import time
from typing import Any

import httpx

logger = logging.getLogger("clarifi.market")

_CACHE_TTL_SECONDS = 300  # 5 minutes
_cached_data: dict[str, Any] | None = None
_cached_timestamp: float = 0.0


def _fetch_yahoo_chart(symbol: str, range_str: str = "1y", interval: str = "1d") -> dict | None:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range={range_str}&interval={interval}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("chart", {}).get("result")
                if results and len(results) > 0:
                    return results[0]
    except Exception as exc:
        logger.warning("Failed to fetch live market chart for %s: %s", symbol, exc)
    return None


def get_live_market_pulse() -> dict[str, Any]:
    """Returns real-time benchmark quotes, technical indicators, and detected market regime."""
    global _cached_data, _cached_timestamp

    now = time.time()
    if _cached_data is not None and (now - _cached_timestamp) < _CACHE_TTL_SECONDS:
        return _cached_data

    # Default fallback data in case of complete network outage
    fallback = {
        "status": "fallback",
        "timestamp": int(now),
        "indices": {
            "nifty50": {
                "symbol": "^NSEI",
                "name": "NIFTY 50",
                "price": 22888.95,
                "change": 167.0,
                "change_pct": 0.74,
                "sma_50": 23514.0,
                "sma_200": 24174.0,
            },
            "sensex": {
                "symbol": "^BSESN",
                "name": "BSE SENSEX",
                "price": 73852.9,
                "change": 819.12,
                "change_pct": 1.12,
            },
            "vix": {
                "symbol": "^INDIAVIX",
                "name": "India VIX",
                "price": 14.77,
                "change": 0.65,
                "change_pct": 4.60,
            },
            "gold": {
                "symbol": "GOLDBEES.NS",
                "name": "Gold ETF",
                "price": 63.85,
                "change": 0.40,
                "change_pct": 0.63,
            },
        },
        "regime": {
            "id": 0,
            "name": "Bear Market",
            "tag": "Correction / Downward Pressure",
            "rationale": "NIFTY 50 is trading below its 200-day moving average (24,174) with short-term consolidation.",
            "is_live": False,
        },
    }

    try:
        # 1. Fetch NIFTY 50 (1 year daily chart for SMA)
        nifty_chart = _fetch_yahoo_chart("^NSEI", range_str="1y", interval="1d")
        # 2. Fetch SENSEX
        sensex_chart = _fetch_yahoo_chart("^BSESN", range_str="5d", interval="1d")
        # 3. Fetch India VIX
        vix_chart = _fetch_yahoo_chart("^INDIAVIX", range_str="5d", interval="1d")
        # 4. Fetch Gold ETF
        gold_chart = _fetch_yahoo_chart("GOLDBEES.NS", range_str="5d", interval="1d")

        if not nifty_chart:
            _cached_data = fallback
            _cached_timestamp = now
            return fallback

        # Extract NIFTY indicators
        nifty_meta = nifty_chart.get("meta", {})
        nifty_price = float(nifty_meta.get("regularMarketPrice") or 22888.95)
        nifty_prev = float(nifty_meta.get("chartPreviousClose") or nifty_price)
        nifty_change = round(nifty_price - nifty_prev, 2)
        nifty_change_pct = round((nifty_change / max(1.0, nifty_prev)) * 100.0, 2)

        closes = nifty_chart.get("indicators", {}).get("quote", [{}])[0].get("close", [])
        valid_closes = [float(c) for c in closes if c is not None]
        sma_200 = round(sum(valid_closes[-200:]) / len(valid_closes[-200:]), 2) if len(valid_closes) >= 200 else nifty_price
        sma_50 = round(sum(valid_closes[-50:]) / len(valid_closes[-50:]), 2) if len(valid_closes) >= 50 else nifty_price

        # Extract SENSEX
        sensex_meta = sensex_chart.get("meta", {}) if sensex_chart else {}
        sensex_price = float(sensex_meta.get("regularMarketPrice") or 73852.9)
        sensex_prev = float(sensex_meta.get("chartPreviousClose") or sensex_price)
        sensex_change = round(sensex_price - sensex_prev, 2)
        sensex_change_pct = round((sensex_change / max(1.0, sensex_prev)) * 100.0, 2)

        # Extract VIX
        vix_meta = vix_chart.get("meta", {}) if vix_chart else {}
        vix_price = float(vix_meta.get("regularMarketPrice") or 14.77)
        vix_prev = float(vix_meta.get("chartPreviousClose") or vix_price)
        vix_change = round(vix_price - vix_prev, 2)
        vix_change_pct = round((vix_change / max(1.0, vix_prev)) * 100.0, 2)

        # Extract Gold
        gold_meta = gold_chart.get("meta", {}) if gold_chart else {}
        gold_price = float(gold_meta.get("regularMarketPrice") or 63.85)
        gold_prev = float(gold_meta.get("chartPreviousClose") or gold_price)
        gold_change = round(gold_price - gold_prev, 2)
        gold_change_pct = round((gold_change / max(1.0, gold_prev)) * 100.0, 2)

        # Compute Live Market Climate / Regime
        # Bear: Below 200 SMA by >2% or VIX > 22
        if nifty_price < sma_200 * 0.98 or vix_price >= 22.0:
            regime_id = 0
            regime_name = "Bear Market"
            regime_tag = "Correction / Bearish Pressure"
            regime_rationale = (
                f"NIFTY 50 (₹{nifty_price:,.0f}) is trading below its 200-day SMA (₹{sma_200:,.0f}) "
                f"with India VIX at {vix_price:.1f}, indicating elevated market defensiveness."
            )
        # Bull: Above 50 & 200 SMA and low/moderate VIX
        elif nifty_price > sma_50 and nifty_price > sma_200 and vix_price < 17.0:
            regime_id = 2
            regime_name = "Bull Expansion"
            regime_tag = "Bullish Momentum"
            regime_rationale = (
                f"NIFTY 50 (₹{nifty_price:,.0f}) is trending firmly above its 50-day (₹{sma_50:,.0f}) and "
                f"200-day SMAs (₹{sma_200:,.0f}) with steady volatility (VIX: {vix_price:.1f})."
            )
        else:
            regime_id = 1
            regime_name = "Normal / Range-Bound"
            regime_tag = "Consolidation / Range-Bound"
            regime_rationale = (
                f"NIFTY 50 (₹{nifty_price:,.0f}) is consolidating near its 50-day moving average (₹{sma_50:,.0f}) "
                f"with stable volatility (VIX: {vix_price:.1f})."
            )

        live_result = {
            "status": "live",
            "timestamp": int(now),
            "indices": {
                "nifty50": {
                    "symbol": "^NSEI",
                    "name": "NIFTY 50",
                    "price": nifty_price,
                    "change": nifty_change,
                    "change_pct": nifty_change_pct,
                    "sma_50": sma_50,
                    "sma_200": sma_200,
                },
                "sensex": {
                    "symbol": "^BSESN",
                    "name": "BSE SENSEX",
                    "price": sensex_price,
                    "change": sensex_change,
                    "change_pct": sensex_change_pct,
                },
                "vix": {
                    "symbol": "^INDIAVIX",
                    "name": "India VIX",
                    "price": vix_price,
                    "change": vix_change,
                    "change_pct": vix_change_pct,
                },
                "gold": {
                    "symbol": "GOLDBEES.NS",
                    "name": "Gold ETF",
                    "price": gold_price,
                    "change": gold_change,
                    "change_pct": gold_change_pct,
                },
            },
            "regime": {
                "id": regime_id,
                "name": regime_name,
                "tag": regime_tag,
                "rationale": regime_rationale,
                "is_live": True,
            },
        }

        _cached_data = live_result
        _cached_timestamp = now
        return live_result

    except Exception as exc:
        logger.exception("Error extracting live market pulse: %s", exc)
        _cached_data = fallback
        _cached_timestamp = now
        return fallback
