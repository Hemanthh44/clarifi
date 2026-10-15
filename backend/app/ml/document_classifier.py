"""ML-based financial document category classifier.

A nearest-centroid classifier over TF-IDF features: each financial
document category is represented by a centroid vector computed from a
small labeled seed corpus of representative language for that category
(the "training data" below). An uploaded document's extracted text is
projected into the same TF-IDF space and assigned to whichever category
centroid it's closest to by cosine similarity, with that similarity
reported back as a confidence score.

This is deliberately the same dependency-light approach ClariFi already
uses for RAG retrieval (see app/rag/embeddings.py) rather than a
heavyweight embedding/deep-learning model: no model download, no API
call, fully deterministic, and easy to inspect or extend by editing the
seed corpus below. It's a genuine statistical text classifier — trained
(fit) once from labeled examples, then used for inference — just a small
and explainable one, matching how the rest of ClariFi's ML/NLP is built.

It's meant to save the user a manual category pick, not to be
authoritative: low-confidence predictions fall back to "Other", and
nothing here blocks or overrides what the user does with the document.
"""
from __future__ import annotations

import numpy as np

from app.rag.embeddings import TfidfVectorizer

# A small labeled seed corpus: representative phrases for each financial
# document category. This is the classifier's training data — extend it
# with more/better exemplars to improve accuracy without touching any
# other code, since app/ml/document_classifier.py is the only place this
# is read from.
TRAINING_EXAMPLES: dict[str, list[str]] = {
    "Mutual Fund": [
        "This scheme information document describes the mutual fund's investment objective, asset allocation, and expense ratio.",
        "Net asset value NAV is calculated daily and units are allotted based on the applicable NAV.",
        "The fund invests in a diversified portfolio of equity and debt securities as per the scheme's benchmark.",
        "Exit load applies if units are redeemed within the specified lock-in period from the date of allotment.",
        "SIP systematic investment plan instalments are debited monthly from the investor's bank account.",
        "The scheme's expense ratio, fund manager details, and past performance are disclosed in the factsheet.",
    ],
    "Insurance": [
        "This policy document sets out the sum assured, premium payment terms, and policy exclusions.",
        "The insurer shall not be liable for claims arising from pre-existing conditions not disclosed at inception.",
        "Free look period allows the policyholder to cancel the policy within 15 days of receipt.",
        "Premium is payable annually, and the policy lapses if premiums are not paid within the grace period.",
        "The nominee shall receive the death benefit in the event of the life assured's demise during the policy term.",
        "Riders such as critical illness and accidental death benefit can be added to the base policy.",
    ],
    "Fixed Deposit": [
        "The fixed deposit certificate confirms the principal amount, tenure, and rate of interest applicable.",
        "Interest is compounded quarterly and credited to the depositor's linked savings account.",
        "Premature withdrawal of the deposit attracts a penalty and a reduced rate of interest.",
        "On maturity, the principal along with accrued interest will be credited automatically unless renewed.",
        "TDS is deducted on interest income exceeding the threshold specified under the Income Tax Act.",
    ],
    "Loan / Credit": [
        "This loan agreement specifies the principal amount, interest rate, EMI schedule, and repayment tenure.",
        "The borrower agrees to repay the loan through equated monthly instalments EMI debited on the due date.",
        "Late payment of EMI attracts a penal interest charge and may affect the borrower's credit score.",
        "The lender holds a security interest over the pledged collateral until the loan is fully repaid.",
        "Prepayment or foreclosure of the loan may be subject to charges as per the sanction letter.",
    ],
    "Stocks & Brokerage": [
        "This contract note confirms the purchase and sale of equity shares executed on the exchange.",
        "Brokerage charges, securities transaction tax, and stamp duty are levied on each executed trade.",
        "The demat account holds securities in electronic form as per depository participant records.",
        "Margin requirements must be maintained for intraday and derivative positions as per exchange rules.",
        "Corporate actions such as dividends, bonus issues, and stock splits are credited to the shareholder's account.",
    ],
    "Tax Document": [
        "This document summarizes taxable income, deductions claimed, and tax payable for the assessment year.",
        "Form 16 certifies the tax deducted at source TDS by the employer on salary income.",
        "Deductions under section 80C, 80D, and other provisions of the Income Tax Act are itemized below.",
        "The taxpayer is required to file the income tax return before the due date to avoid penalty.",
        "Capital gains from the sale of securities or property are computed and reported for tax purposes.",
    ],
    "Retirement / Pension": [
        "This statement shows the accumulated corpus in the employee provident fund or pension scheme account.",
        "Contributions are made monthly by both employee and employer towards the retirement fund.",
        "On retirement, a portion of the pension corpus can be withdrawn while the remainder is annuitized.",
        "The National Pension System NPS account is regulated and offers market-linked retirement savings.",
    ],
    "Bank Statement": [
        "This statement lists all debit and credit transactions in the account for the given period.",
        "The closing balance reflects all cleared transactions as of the statement date.",
        "Standing instructions and auto-debit mandates are listed along with their next due dates.",
        "Account holder is advised to report any unauthorized transaction within the stipulated period.",
    ],
}

CATEGORIES: tuple[str, ...] = tuple(TRAINING_EXAMPLES.keys())

# Below this cosine-similarity score, a prediction is treated as too weak
# to be useful and reported as "Other" instead of a possibly-wrong label.
# Calibrated empirically: unrelated text lands around 0.0-0.14 against this
# seed corpus, while genuine matches for their category land at 0.4+, so
# 0.20 sits comfortably in the gap between "noise" and "real match".
_CONFIDENCE_FLOOR = 0.20

_vectorizer: TfidfVectorizer | None = None
_centroids: np.ndarray | None = None
_centroid_labels: list[str] = []


def _ensure_trained() -> None:
    """Lazily fit the classifier once, on first use, from TRAINING_EXAMPLES."""
    global _vectorizer, _centroids, _centroid_labels
    if _vectorizer is not None:
        return

    texts: list[str] = []
    labels: list[str] = []
    for category, examples in TRAINING_EXAMPLES.items():
        for example in examples:
            texts.append(example)
            labels.append(category)

    vectorizer = TfidfVectorizer()
    matrix = vectorizer.fit_transform(texts)

    centroids = []
    ordered_labels = []
    for category in CATEGORIES:
        rows = [i for i, label in enumerate(labels) if label == category]
        centroid = matrix[rows].mean(axis=0)
        norm = np.linalg.norm(centroid)
        centroids.append(centroid / norm if norm else centroid)
        ordered_labels.append(category)

    _vectorizer = vectorizer
    _centroids = np.vstack(centroids)
    _centroid_labels = ordered_labels


def classify_document(text: str) -> tuple[str, float]:
    """Predict the most likely financial document category for `text`.

    Returns (category, confidence): confidence is a 0-1 cosine similarity
    against the closest category centroid. Returns ("Other", 0.0) for
    empty text or text too dissimilar from every trained category, rather
    than forcing a low-confidence guess.
    """
    _ensure_trained()
    assert _vectorizer is not None and _centroids is not None

    if not text or not text.strip():
        return "Other", 0.0

    query_vec = _vectorizer.transform([text])[0]
    if not np.any(query_vec):
        return "Other", 0.0

    similarities = _centroids @ query_vec
    best_idx = int(np.argmax(similarities))
    confidence = float(similarities[best_idx])

    if confidence < _CONFIDENCE_FLOOR:
        return "Other", round(confidence, 3)

    return _centroid_labels[best_idx], round(confidence, 3)
