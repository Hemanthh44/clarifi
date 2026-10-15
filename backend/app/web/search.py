from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger("clarifi.web")

TAVILY_SEARCH_URL = "https://api.tavily.com/search"


def _search_topic(query: str) -> str:
    text = query.lower()
    if any(term in text for term in [
        "latest news",
        "today's news",
        "today news",
        "market news",
        "breaking news",
        "what happened today",
        "news about",
    ]):
        return "news"
    return "finance"


def search_web(query: str, max_results: int | None = None) -> dict[str, Any]:
    """Search Tavily and return normalized results.

    Tavily is called only from the backend, so the API key never reaches the
    browser. Errors are converted into a structured result so /api/ask can
    gracefully fall back to the existing ClariFi flow.
    """
    settings = get_settings()
    if not settings.tavily_api_key:
        return {"query": query, "results": [], "answer": None, "error": "TAVILY_API_KEY is not configured."}

    payload = {
        "query": query,
        "search_depth": "basic",
        "chunks_per_source": 2,
        "max_results": max_results or settings.tavily_max_results,
        "topic": _search_topic(query),
        "include_answer": True,
        "include_published_date": True,
        "include_raw_content": False,
        "include_favicon": False,
        "language": "en",
    }

    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.post(
                TAVILY_SEARCH_URL,
                headers={
                    "Authorization": f"Bearer {settings.tavily_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data.get("results", []):
            url = item.get("url")
            if not url:
                continue
            results.append(
                {
                    "title": item.get("title") or url,
                    "url": url,
                    "content": (item.get("content") or "").strip(),
                    "score": float(item.get("score") or 0),
                    "published_date": item.get("published_date"),
                }
            )

        return {
            "query": query,
            "results": results,
            "answer": data.get("answer"),
            "error": None,
        }
    except httpx.HTTPStatusError as exc:
        logger.warning("Tavily search failed with HTTP %s: %s", exc.response.status_code, exc.response.text[:500])
        return {"query": query, "results": [], "answer": None, "error": f"Tavily returned HTTP {exc.response.status_code}."}
    except Exception as exc:  # pragma: no cover - defensive network fallback
        logger.warning("Tavily search failed: %s", exc)
        return {"query": query, "results": [], "answer": None, "error": "Live web search is temporarily unavailable."}
