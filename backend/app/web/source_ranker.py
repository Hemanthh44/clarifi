from __future__ import annotations

from urllib.parse import urlparse

# Primary/authoritative sources get a ranking boost. We still let Tavily
# discover other reputable sources rather than restricting search to these
# domains only.
AUTHORITATIVE_DOMAINS = {
    "sebi.gov.in": 100,
    "rbi.org.in": 100,
    "amfiindia.com": 95,
    "nseindia.com": 95,
    "bseindia.com": 95,
    "incometax.gov.in": 95,
    "finmin.gov.in": 95,
    "mca.gov.in": 90,
}

REPUTABLE_DOMAINS = {
    "reuters.com": 70,
    "bloomberg.com": 70,
    "moneycontrol.com": 65,
    "economictimes.indiatimes.com": 65,
    "livemint.com": 65,
    "business-standard.com": 65,
}


def _domain(url: str) -> str:
    host = urlparse(url).netloc.lower().split(":", 1)[0]
    return host[4:] if host.startswith("www.") else host


def _domain_score(domain: str) -> int:
    if domain in AUTHORITATIVE_DOMAINS:
        return AUTHORITATIVE_DOMAINS[domain]
    if domain in REPUTABLE_DOMAINS:
        return REPUTABLE_DOMAINS[domain]
    for known, score in AUTHORITATIVE_DOMAINS.items():
        if domain.endswith("." + known):
            return score - 5
    return 40


def rank_sources(results: list[dict], limit: int = 6) -> list[dict]:
    """Deduplicate and rank sources by relevance + domain authority."""
    seen: set[str] = set()
    ranked = []

    for item in results:
        url = item.get("url")
        if not url or url in seen:
            continue
        seen.add(url)
        domain = _domain(url)
        item = {**item, "domain": domain}
        item["authority_score"] = _domain_score(domain)
        item["rank_score"] = (float(item.get("score") or 0) * 100) + item["authority_score"]
        ranked.append(item)

    ranked.sort(key=lambda x: x["rank_score"], reverse=True)
    return ranked[:limit]
