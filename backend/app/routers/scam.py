from fastapi import APIRouter

from app.compliance.guardrail import apply_guardrail
from app.ml.scam_classifier import classify_scam_message
from app.routers.history import add_history
from app.scam.pattern_matcher import analyze_message, explain
from app.schemas import MLScamAnalysis, RedFlag, ScamAnalyzeRequest, ScamAnalyzeResponse, TokenAttribution

router = APIRouter(prefix="/api/scam", tags=["scam"])


@router.post("/analyze", response_model=ScamAnalyzeResponse)
def analyze(payload: ScamAnalyzeRequest) -> ScamAnalyzeResponse:
    # Engine 1: SEBI Regulatory Pattern Matching
    result = analyze_message(payload.message)
    explanation_raw = explain(result["flags"])
    explanation, meta = apply_guardrail(explanation_raw, has_sources=False)

    # Engine 2: Statistical Machine Learning Text Classifier
    ml_result = classify_scam_message(payload.message)

    # Compute Dual-Engine Ensemble Risk Score
    rule_score = result["score"]
    ml_score = ml_result["ml_score"]
    if len(result["flags"]) > 0:
        ensemble_score = round(0.55 * rule_score + 0.45 * ml_score, 3)
    else:
        ensemble_score = round(0.25 * rule_score + 0.75 * ml_score, 3)
    ensemble_score = min(1.0, max(0.0, ensemble_score))

    detection_notes = (
        "Dual-Layer Fraud Protection System: "
        "(1) Regulatory Compliance Scanner checks against SEBI enforcement patterns (unregistered tips, "
        "unrealistic return guarantees, false urgency). "
        "(2) Language & Phishing Scanner analyzes message context and manipulation keywords "
        "to distinguish genuine investment notices from illicit solicitations."
    )

    add_history("Scam message analyzed", f"{result['risk_level']} ({ml_result['ml_label']}) · {len(result['flags'])} pattern(s)")

    ml_analysis_obj = MLScamAnalysis(
        ml_score=ml_result["ml_score"],
        ml_label=ml_result["ml_label"],
        ml_confidence=ml_result["ml_confidence"],
        top_tokens=[TokenAttribution(**t) for t in ml_result.get("top_tokens", [])],
        model=ml_result["model"],
        metrics=ml_result.get("metrics", {}),
    )

    return ScamAnalyzeResponse(
        risk_level=result["risk_level"],
        score=result["score"],
        flags=[RedFlag(**f) for f in result["flags"]],
        explanation=explanation,
        detection_notes=detection_notes,
        compliance=meta,
        ml_analysis=ml_analysis_obj,
        ensemble_score=ensemble_score,
    )
