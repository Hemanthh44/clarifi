"""Explainable fraud-pattern definitions for ClariFi Scam Screener.

These are deterministic screening signals, not a fraud verdict. Multiple independent
signals raise the score; the UI explains exactly which patterns matched.
"""
import re

PatternDef = tuple[str, str, str, float]

PATTERNS: list[PatternDef] = [
    ("guaranteed_returns", "Guaranteed returns", r"\b(guarantee(d)?|assured|fixed)\b[^.]{0,80}\b(\d{1,3}\s?%|return|profit)\b", 0.30),
    ("unrealistic_returns", "Unrealistic return promise", r"\b(\d{2,3})\s?%\s?(per\s?(month|week|day)|monthly|weekly|daily)\b", 0.30),
    ("urgency_pressure", "Pressure to act urgently", r"\b(act\s+(now|urgently|fast)|hurry|last\s+chance|closing\s+soon|expires?\s+(today|tonight|soon)|within\s+\d+\s*(minutes?|hours?)|before\s+.*(close|expire))\b", 0.18),
    ("payment_transfer_request", "Payment or transfer request", r"\b(transfer|pay|deposit|send|processing\s+fee|registration\s+fee|activation\s+fee)\b[^.]{0,80}\b(now|immediately|₹|rs\.?|inr|fee|payment|amount)\b", 0.22),
    ("unregistered_claim", "Unverified regulatory claim", r"\b(rbi[-\s]?approved|sebi[-\s]?approved|government[-\s]?backed|100%\s+safe)\b", 0.20),
    ("suspicious_contact", "Suspicious or exclusive contact channel", r"\b(contact\s+only|this\s+number\s+only|dm\s+me|whatsapp\s+only|telegram\s+group|on\s+whatsapp)\b", 0.15),
    ("secrecy_request", "Request for secrecy", r"\b(do\s?n['o]?t\s+tell|keep\s+this\s+(confidential|secret)|don'?t\s+share\s+with)\b", 0.15),
    ("referral_pyramid", "Referral / recruitment incentive language", r"\b(refer\s+(and|to)\s+earn|recruit|onboard\s+more\s+investors|earn\s+for\s+every\s+referral)\b", 0.20),
    ("credential_request", "Request for sensitive credentials", r"\b(share|send|provide|tell|enter)\b[^.]{0,80}\b(otp|one[-\s]?time\s+password|pin|password|cvv|card\s+number|net[-\s]?banking)\b", 0.35),
    ("identity_document_request", "Request for identity or banking details", r"\b(send|share|provide|submit|give)\b[^.]{0,100}\b(pan|aadhaar|aadhar|bank\s+account|account\s+(number|details)|ifsc|kyc\s+details)\b", 0.32),
    ("suspicious_link", "Suspicious link", r"(?:https?://|www\.)[^\s]+", 0.10),
    ("impersonation", "Possible institution impersonation", r"\b(official|officer|manager|representative|agent)\b[^.]{0,50}\b(rbi|sebi|bank|income\s+tax|mutual\s+fund)\b|\b(sbi|hdfc|icici|axis|rbi|sebi)\b[^.]{0,40}\b(security|department|verification|kyc)\b", 0.20),
    ("account_threat", "Threat of account restriction", r"\b(account|bank|demat|investment)\b[^.]{0,50}\b(block(ed)?|freeze|suspend|close|deactivate|restricted)\b", 0.20),
    ("prize_bonus_claim", "Unexpected prize or bonus claim", r"\b(congratulations|selected|winner|bonus|reward|cash\s+prize|you\s+have\s+won)\b[^.]{0,100}\b(claim|receive|release|selected|waiting)\b", 0.22),
]

COMPILED_PATTERNS = [(pid, label, re.compile(rx, re.IGNORECASE), weight) for pid, label, rx, weight in PATTERNS]
