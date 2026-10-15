from fastapi import APIRouter

from app.agents.orchestrator import handle_ask
from app.schemas import AskRequest, AskResponse

router = APIRouter(prefix="/api/ask", tags=["ask"])


@router.post("", response_model=AskResponse)
def ask(payload: AskRequest) -> AskResponse:
    """The single entry point the frontend's Ask ClariFi page calls.
    The Orchestrator Agent decides which specialist handles it."""
    return handle_ask(
        payload.message,
        document_id=payload.document_id,
        web_search=payload.web_search,
    )
