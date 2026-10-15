"""Phrases the Compliance Guardrail treats as explicit buy/sell advice.
Any LLM-generated text is scanned against these before being returned
to the user; matches are stripped and logged as a compliance event
rather than silently shipped.
"""
import re

ADVICE_PATTERNS = [
    r"\byou should (buy|sell|invest in)\b",
    r"\bwe recommend (buying|selling|investing in)\b",
    r"\b(buy|sell) (this|now|immediately)\b",
    r"\bthis is a (buy|sell|strong buy|strong sell)\b",
    r"\bguaranteed to (profit|return|perform)\b",
]

COMPILED_ADVICE_PATTERNS = [re.compile(p, re.IGNORECASE) for p in ADVICE_PATTERNS]

DISCLAIMER = (
    "ClariFi provides educational and analytical information. It does not provide personalized "
    "investment advice or explicit buy/sell recommendations."
)
