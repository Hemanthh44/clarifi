"""Retrieval facade used by Product Explainer."""
from __future__ import annotations

from app.rag.vector_store import get_vector_store

ACTION_QUERIES = {
    "summarize": "scheme mutual fund investment objective strategy portfolio asset allocation risk fees expenses minimum investment redemption eligibility restrictions",
    "risks": "risk factors market risk credit risk liquidity risk interest rate risk concentration operational regulatory risk loss investor",
    "compare": "investment objective strategy asset allocation risk returns fees expenses minimum investment redemption liquidity exit load suitability restrictions",
}


def retrieve(query: str, top_k: int = 4, document_filter: str | None = None, action: str = "ask") -> list[dict]:
    store = get_vector_store()
    expanded = f"{query} {ACTION_QUERIES.get(action, '')}".strip()

    if action == "summarize" and document_filter:
        semantic = store.search(expanded, top_k=8, document_filter=document_filter)
        representative = store.representative(document_filter, limit=10)
        return _merge(semantic, representative, limit=12)

    limit = 8 if action in {"risks", "compare"} else top_k
    return store.search(expanded, top_k=limit, document_filter=document_filter)


def _merge(primary: list[dict], secondary: list[dict], limit: int) -> list[dict]:
    result: list[dict] = []
    seen: set[tuple[str, int, str]] = set()
    for item in primary + secondary:
        key = (item["doc"], item["page"], item["text"][:100])
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
        if len(result) >= limit:
            break
    return result
