"""Image upload + multimodal analysis (Priority 2 / Feature: Image/Document
Analysis Agent).

Accepts a screenshot, chart, statement, or investment-message screenshot,
and asks the configured multimodal LLM (Gemini) what it actually shows.
Never invents values — see app.llm.client.LLMClient.analyze_image, which
is explicit about low readability or a missing API key rather than
guessing numbers.
"""
from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.compliance.guardrail import build_compliance_meta
from app.config import get_settings
from app.llm.client import get_llm_client
from app.schemas import ImageAnalysisResponse

router = APIRouter(prefix="/api/image", tags=["image"])

ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}


@router.post("/analyze", response_model=ImageAnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    question: str = Form(""),
) -> ImageAnalysisResponse:
    settings = get_settings()

    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image type '{content_type}'. Upload PNG, JPG, JPEG, or WEBP.",
        )

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_upload_mb:
        raise HTTPException(status_code=413, detail=f"Image exceeds {settings.max_upload_mb}MB limit")
    if not content:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")

    llm = get_llm_client()
    result = llm.analyze_image(content, content_type, question or None)

    meta = build_compliance_meta(has_sources=False, flagged_terms=[])

    return ImageAnalysisResponse(
        readable=result["readable"],
        readability=result["readability"],
        analysis=result["analysis"],
        extracted_values=result["extracted_values"],
        warnings=result["warnings"],
        compliance=meta,
    )
