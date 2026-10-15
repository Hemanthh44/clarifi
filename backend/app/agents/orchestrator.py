"""Central Orchestrator Agent for ClariFi."""
from __future__ import annotations

from app.agents import product_explainer_agent, risk_simulator_agent, scam_screener_agent, summary_agent
from app.agents.base import Trace
from app.compliance.guardrail import apply_guardrail
from app.data.database import get_portfolio
from app.llm.client import get_llm_client
from app.risk_engine.risk_score import compute_risk_score
from app.schemas import AskResponse, Source
from app.web.search import search_web
from app.web.source_ranker import rank_sources

AGENT_DISPLAY_NAMES = {
    "product_explainer": "Product Explainer",
    "risk_simulator": "Risk Simulator",
    "summary_agent": "Summary Agent",
    "scam_screener": "Scam Screener",
    "web_research": "Web Research",
}


def _needs_web_search(message: str) -> bool:
    text = message.lower().strip()
    current_terms = [
        "current", "currently", "latest", "today", "now", "recent", "recently",
        "this week", "this month", "as of", "right now", "live", "updated",
        "news", "breaking", "repo rate", "interest rate", "fd rate",
        "stock price", "share price", "market price", "nifty", "sensex",
        "bitcoin price", "crypto price", "sebi regulation", "rbi regulation",
        "new rule", "new rules", "new regulation", "recent regulation",
    ]
    return any(term in text for term in current_terms)


def _web_sources_to_schema(results: list[dict]) -> list[Source]:
    return [
        Source(
            doc=item["title"],
            page=None,
            section=item.get("domain"),
            snippet=item.get("content", "")[:320],
            url=item.get("url"),
            domain=item.get("domain"),
            source_type="web",
        )
        for item in results
    ]


def handle_ask(
    message: str,
    document_id: str | None = None,
    web_search: bool | None = None,
) -> AskResponse:
    trace = Trace()
    trace.log("Orchestrator", "Determining request type")

    use_web = _needs_web_search(message) if web_search is None else web_search

    if use_web:
        trace.log("Orchestrator", "Current/live information requested")
        trace.log("Web Search", "Searching live web sources")

        search = search_web(message)
        ranked_sources = rank_sources(search["results"])

        if ranked_sources:
            trace.log("Web Search", f"Found {len(ranked_sources)} relevant source(s)")
            llm = get_llm_client()
            narration = llm.narrate_web_answer(message, ranked_sources, search.get("answer"))
            answer, meta = apply_guardrail(
                narration["answer"],
                has_sources=True,
            )

            trace.log("LLM", "Generated a source-grounded web answer")
            trace.log("Compliance Guard", "Response verified")

            return AskResponse(
                agent_used=AGENT_DISPLAY_NAMES["web_research"],
                answer=answer,
                key_points=narration.get("key_points", []),
                sources=_web_sources_to_schema(ranked_sources),
                trace=trace.as_list(),
                compliance=meta,
                web_searched=True,
                explanation=narration.get("explanation"),
                why_it_matters=narration.get("why_it_matters"),
                risks=narration.get("risks", []),
                next_steps=narration.get("next_steps", []),
                evidence_strength="High" if len(ranked_sources) >= 3 else "Medium",
            )

        # Never silently answer a current-data question from the static RAG
        # corpus. That could make stale information look current. Return a
        # graceful, source-transparent response instead.
        trace.log("Web Search", "No usable live sources found")
        answer = (
            "I couldn't retrieve reliable live web sources for this question right now. "
            "Please check that TAVILY_API_KEY is configured in backend/.env and try again."
        )
        answer, meta = apply_guardrail(answer, has_sources=False)
        trace.log("Compliance Guard", "Response verified")
        return AskResponse(
            agent_used=AGENT_DISPLAY_NAMES["web_research"],
            answer=answer,
            key_points=["Live web search did not return usable sources."],
            sources=[],
            trace=trace.as_list(),
            compliance=meta,
            web_searched=True,
        )

    llm = get_llm_client()
    intent = llm.classify_intent(message)
    trace.log("Orchestrator", f"Routed to {AGENT_DISPLAY_NAMES.get(intent, intent)}")

    if intent == "risk_simulator":
        raw = get_portfolio()
        if not raw:
            answer = "No portfolio is connected yet. Open Portfolio Overview and enter your real portfolio allocation first."
            answer, meta = apply_guardrail(answer, has_sources=False)
            return AskResponse(agent_used=AGENT_DISPLAY_NAMES["risk_simulator"], answer=answer, key_points=[], sources=[], trace=trace.as_list(), compliance=meta, web_searched=False)
        asset_mix = [{"label":"Equity","value":raw["equity"]},{"label":"Debt","value":raw["debt"]},{"label":"Others","value":raw["others"]}]
        result = risk_simulator_agent.handle(message, trace, asset_mix)
    elif intent == "summary_agent":
        raw = get_portfolio()
        if not raw:
            answer = "No portfolio is connected yet. Open Portfolio Overview and enter your real portfolio details first."
            answer, meta = apply_guardrail(answer, has_sources=False)
            return AskResponse(agent_used=AGENT_DISPLAY_NAMES["summary_agent"], answer=answer, key_points=[], sources=[], trace=trace.as_list(), compliance=meta, web_searched=False)
        asset_mix = [{"label":"Equity","value":raw["equity"]},{"label":"Debt","value":raw["debt"]},{"label":"Others","value":raw["others"]}]
        risk = compute_risk_score(asset_mix)
        enriched_portfolio = {"value":raw["value"], "assetMix":asset_mix, "goals":{"onTrack":raw["goals_on_track"],"total":raw["goals_total"]}, "riskScore":risk["score"], "riskLabel":risk["label"]}
        result = summary_agent.handle(message, trace, enriched_portfolio)
    elif intent == "scam_screener":
        result = scam_screener_agent.handle(message, trace)
    else:
        intent = "product_explainer"
        result = product_explainer_agent.handle(message, trace, document_id=document_id)

    return AskResponse(
        agent_used=AGENT_DISPLAY_NAMES[intent],
        answer=result["answer"],
        key_points=result["key_points"],
        sources=result.get("sources", []),
        trace=trace.as_list(),
        compliance=result["compliance"],
        web_searched=False,
        explanation=result.get("explanation"),
        why_it_matters=result.get("why_it_matters"),
        risks=result.get("risks", []),
        next_steps=result.get("next_steps", []),
        evidence_strength=result.get("evidence_strength"),
    )
