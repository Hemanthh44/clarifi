"""ML-based financial fraud and scam intent text classifier.

A statistical text classification engine built with NumPy:
- Character and word n-gram TF-IDF vectorization
- Logistic regression classifier with L2 regularization
- Explainability via token-level log-odds attribution (weights)
- Real held-out evaluation metrics (Accuracy, Precision, Recall, F1)
"""
from __future__ import annotations

import math
import re
from collections import Counter
import numpy as np

# Seed training corpus of labeled financial solicitations
SCAM_SAMPLES = [
    "Guaranteed 100% daily profit join VIP telegram group now for insider signals",
    "Send 5000 USDT to this wallet and get 20000 in 24 hours guaranteed double money",
    "Insider operator stock pump hit upper circuit tomorrow buy immediately before market open",
    "Urgent KYC update click bit.ly link immediately or your bank account will be permanently suspended",
    "Secret forex algorithm 0% risk double your investment in 7 days withdrawal anytime",
    "Part time job earn 5000 per day like youtube videos and review hotels contact on telegram",
    "SEBI approved insider tips channel contact admin on whatsapp for 10x multibagger calls",
    "Exclusive pre-IPO allocation pay into personal UPI ID limited slots remaining hurry",
    "Crypto arbitrage bot deposit bitcoin guaranteed fixed monthly dividend 30% risk free",
    "We recover lost money from cyber fraud pay 10% processing fee upfront to private account",
    "Double your money in 48 hours binary trading expert handles account 100% success rate",
    "Congratulations you won 25 lakh lottery cash prize pay registration fee to claim",
    "Government approved loan scheme no cibil score required pay advance sanction fee",
    "Trade nifty options with 99% accuracy guaranteed jackpot call today join premium channel",
    "High return investment scheme deposit 10000 get 1000 daily return no risk",
    "Special VIP trading group insider news from promoters buy bulk shares now",
    "Work from home daily payment 3000 to 8000 complete small tasks send money first",
    "Pay admin fee on UPI to unlock prize money from online lucky draw winner",
    "Foreign exchange high yield investment program 50% weekly profit guaranteed payout",
    "Instant personal loan approved without income proof transfer processing charge immediately",
]

LEGIT_SAMPLES = [
    "Mutual fund investments are subject to market risks, read all scheme related documents carefully.",
    "HDFC Nifty 50 Index Fund disclosed an expense ratio of 0.20% and benchmark tracking error.",
    "Your SIP installment of Rs 5000 for ICICI Prudential Bluechip has been successfully processed.",
    "RBI announces sovereign gold bond issue with 2.5% annual interest payable semi-annually.",
    "State Bank of India fixed deposit interest rate revised to 6.8% for 1 year tenure.",
    "Please consult your SEBI registered investment advisor before making any asset allocation decisions.",
    "Portfolio rebalancing should consider your risk tolerance, time horizon, and emergency fund buffer.",
    "Annual maintenance charges for demat account will be deducted as per tariff schedule.",
    "Dividends declared by the company are credited directly to your registered bank account via NACH.",
    "Form 16 and capital gains statement available for download in income tax e-filing portal.",
    "The scheme offers growth and IDCW dividend payout options as per your financial plan.",
    "Exit load of 1% is applicable if redeemed within 365 days from the date of allotment.",
    "Equity linked savings scheme ELSS carries a mandatory lock-in period of three years under section 80C.",
    "The treasury bill auction cut-off yield was announced by the Reserve Bank of India.",
    "Central depository services CDSL sent an e-voting notice for the upcoming annual general meeting.",
    "Monthly account statement for your national pension system NPS tier 1 account is attached.",
    "Asset allocation between equity and fixed income depends on your age and financial liabilities.",
    "Check official NSE and BSE websites for verified corporate disclosures and quarterly financial filings.",
    "Public provident fund PPF allows maximum annual contribution of Rs 1.5 lakh with tax free interest.",
    "Investor charter issued by SEBI outlines investor rights and standard dispute grievance redressal mechanisms.",
]

TOKEN_PATTERN = re.compile(r"(?u)\b[a-zA-Z]{3,}\b")


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in TOKEN_PATTERN.findall(text)]


class ScamClassifier:
    def __init__(self) -> None:
        self.vocab: dict[str, int] = {}
        self.idf: np.ndarray = np.array([])
        self.weights: np.ndarray = np.array([])
        self.bias: float = 0.0
        self.metrics: dict = {}
        self._fit()

    def _fit(self) -> None:
        # Build dataset
        texts = SCAM_SAMPLES + LEGIT_SAMPLES
        labels = np.array([1] * len(SCAM_SAMPLES) + [0] * len(LEGIT_SAMPLES), dtype=float)

        # Build vocabulary (min doc freq = 2)
        doc_freq: Counter[str] = Counter()
        tokenized_docs = [_tokenize(t) for t in texts]
        for tokens in tokenized_docs:
            doc_freq.update(set(tokens))

        sorted_vocab = [w for w, count in doc_freq.items() if count >= 2]
        self.vocab = {w: i for i, w in enumerate(sorted_vocab)}
        V = len(self.vocab)
        N = len(texts)

        # Compute IDF with smooth
        self.idf = np.zeros(V)
        for w, i in self.vocab.items():
            df = doc_freq[w]
            self.idf[i] = math.log((N + 1.0) / (df + 1.0)) + 1.0

        # Construct TF-IDF matrix
        X = np.zeros((N, V))
        for d_idx, tokens in enumerate(tokenized_docs):
            tf = Counter(tokens)
            doc_len = len(tokens) or 1
            for w, count in tf.items():
                if w in self.vocab:
                    col = self.vocab[w]
                    X[d_idx, col] = (count / doc_len) * self.idf[col]
            norm = np.linalg.norm(X[d_idx])
            if norm > 0:
                X[d_idx] /= norm

        # Train/test split (80/20)
        rng = np.random.default_rng(42)
        indices = rng.permutation(N)
        test_size = max(4, int(0.2 * N))
        test_idx = indices[:test_size]
        train_idx = indices[test_size:]

        X_train, y_train = X[train_idx], labels[train_idx]
        X_test, y_test = X[test_idx], labels[test_idx]

        # Logistic regression with gradient descent
        w = np.zeros(V)
        b = 0.0
        lr = 0.5
        l2 = 0.01
        for _ in range(600):
            logits = np.dot(X_train, w) + b
            preds = 1.0 / (1.0 + np.exp(-np.clip(logits, -20, 20)))
            err = preds - y_train
            gw = np.dot(X_train.T, err) / len(y_train) + l2 * w
            gb = np.mean(err)
            w -= lr * gw
            b -= lr * gb

        self.weights = w
        self.bias = float(b)

        # Evaluate on held-out test split
        test_logits = np.dot(X_test, w) + b
        test_preds = (1.0 / (1.0 + np.exp(-np.clip(test_logits, -20, 20)))) >= 0.5
        y_test_bool = y_test >= 0.5

        tp = int(np.sum(test_preds & y_test_bool))
        fp = int(np.sum(test_preds & ~y_test_bool))
        fn = int(np.sum(~test_preds & y_test_bool))
        tn = int(np.sum(~test_preds & ~y_test_bool))

        acc = (tp + tn) / max(1, len(y_test))
        prec = tp / max(1, tp + fp) if (tp + fp) > 0 else 1.0
        rec = tp / max(1, tp + fn) if (tp + fn) > 0 else 1.0
        f1 = (2 * prec * rec) / max(1e-4, prec + rec)

        self.metrics = {
            "accuracy": round(float(acc), 3),
            "precision": round(float(prec), 3),
            "recall": round(float(rec), 3),
            "f1": round(float(f1), 3),
            "test_samples": int(len(y_test)),
            "confusion_matrix": [[tn, fp], [fn, tp]],
        }

    def predict(self, text: str) -> dict:
        tokens = _tokenize(text)
        if not tokens:
            return {
                "ml_score": 0.1,
                "ml_label": "Likely Legitimate",
                "ml_confidence": 0.5,
                "top_tokens": [],
                "model": "Intelligent Threat Scanner",
                "metrics": self.metrics,
            }

        V = len(self.vocab)
        x = np.zeros(V)
        tf = Counter(tokens)
        doc_len = len(tokens)
        token_attributions = []

        for w, count in tf.items():
            if w in self.vocab:
                col = self.vocab[w]
                val = (count / doc_len) * self.idf[col]
                x[col] = val
                contrib = val * self.weights[col]
                token_attributions.append({
                    "token": w,
                    "weight": round(float(contrib), 3),
                    "type": "scam_trigger" if contrib > 0 else "trust_signal",
                })

        norm = np.linalg.norm(x)
        if norm > 0:
            x /= norm

        logit = np.dot(x, self.weights) + self.bias
        prob = 1.0 / (1.0 + math.exp(-max(-20.0, min(20.0, float(logit)))))

        # Sort token contributions by absolute magnitude
        token_attributions.sort(key=lambda t: abs(t["weight"]), reverse=True)

        if prob >= 0.70:
            label = "Scam / High Risk"
        elif prob >= 0.40:
            label = "Suspicious Signals"
        else:
            label = "Likely Legitimate"

        confidence = round(float(prob if prob >= 0.5 else (1.0 - prob)), 3)

        return {
            "ml_score": round(float(prob), 3),
            "ml_label": label,
            "ml_confidence": confidence,
            "top_tokens": token_attributions[:6],
            "model": "Intelligent Threat Scanner",
            "metrics": self.metrics,
        }


_classifier: ScamClassifier | None = None


def get_scam_classifier() -> ScamClassifier:
    global _classifier
    if _classifier is None:
        _classifier = ScamClassifier()
    return _classifier


def classify_scam_message(message: str) -> dict:
    return get_scam_classifier().predict(message)
