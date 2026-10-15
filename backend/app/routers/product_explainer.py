from fastapi import APIRouter

from app.routers.history import add_history

from app.agents.base import Trace
from app.agents.product_explainer_agent import handle
from app.schemas import AskRequest, AskResponse

router = APIRouter(prefix="/api/product-explainer", tags=["product-explainer"])


@router.post("/ask", response_model=AskResponse)
def ask_product_explainer(payload: AskRequest) -> AskResponse:
    """Direct access to the Product Explainer, bypassing Orchestrator
    routing — used by the dedicated Product Explainer workspace page."""
    trace = Trace()
    trace.log("Product Explainer", "Handling request directly (no routing needed)")
    result = handle(
    payload.message,
    trace,
    document_id=payload.document_id,
    action=payload.action,
)
   
    add_history("Product document analyzed", payload.message[:120])

    return AskResponse(
        agent_used="Product Explainer",
        answer=result["answer"],
        key_points=result["key_points"],
        sources=result["sources"],
        trace=trace.as_list(),
        compliance=result["compliance"],
        explanation=result.get("explanation"),
        why_it_matters=result.get("why_it_matters"),
        risks=result.get("risks", []),
        next_steps=result.get("next_steps", []),
        evidence_strength=result.get("evidence_strength"),
    )
