from app.compliance.guardrail import apply_guardrail
from app.scam.pattern_matcher import analyze_message


def test_scam_message_flagged_high_risk():
    message = (
        "GUARANTEED 40% monthly return. Limited slots left, transfer money now. "
        "100% safe RBI-approved scheme. Contact only on this number."
    )
    result = analyze_message(message)
    assert result["risk_level"] == "High Risk"
    assert len(result["flags"]) >= 3


def test_benign_message_not_flagged():
    result = analyze_message("Are we still meeting for coffee tomorrow?")
    assert result["risk_level"] == "Low Risk"
    assert result["flags"] == []


def test_guardrail_strips_buy_sell_language():
    text = "The fund has a moderate expense ratio. You should buy this fund now."
    cleaned, meta = apply_guardrail(text, has_sources=True)
    assert "buy" not in cleaned.lower()
    assert meta.flagged_terms
    assert meta.source_grounded is True
