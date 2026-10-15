"""A dependency-light TF-IDF vectorizer.

ClariFi's RAG retrieval doesn't require a heavyweight embedding model
for the demo corpus — TF-IDF + cosine similarity is fully deterministic,
needs no downloaded model weights or API calls, and is a drop-in
interface (`fit`, `transform`) that can be swapped for a real embedding
model (OpenAI, Voyage, sentence-transformers) later without touching
`retriever.py` or `vector_store.py`.
"""
from __future__ import annotations

import math
import re
from collections import Counter

import numpy as np

TOKEN_RE = re.compile(r"[a-z0-9]+")

STOPWORDS = {
    "the", "a", "an", "is", "are", "of", "to", "and", "or", "in", "on", "for", "with",
    "this", "that", "it", "as", "by", "be", "at", "from", "was", "were", "which", "such",
}


def tokenize(text: str) -> list[str]:
    return [t for t in TOKEN_RE.findall(text.lower()) if t not in STOPWORDS and len(t) > 1]


class TfidfVectorizer:
    def __init__(self) -> None:
        self.vocabulary: dict[str, int] = {}
        self.idf: np.ndarray | None = None

    def fit(self, documents: list[str]) -> None:
        doc_freq: Counter[str] = Counter()
        tokenized_docs = [tokenize(doc) for doc in documents]
        for tokens in tokenized_docs:
            for term in set(tokens):
                doc_freq[term] += 1

        self.vocabulary = {term: i for i, term in enumerate(sorted(doc_freq))}
        n_docs = len(documents)
        self.idf = np.zeros(len(self.vocabulary))
        for term, i in self.vocabulary.items():
            self.idf[i] = math.log((1 + n_docs) / (1 + doc_freq[term])) + 1

    def transform(self, documents: list[str]) -> np.ndarray:
        if self.idf is None:
            raise RuntimeError("TfidfVectorizer.fit() must be called before transform()")
        vectors = np.zeros((len(documents), len(self.vocabulary)))
        for row, doc in enumerate(documents):
            tokens = tokenize(doc)
            if not tokens:
                continue
            counts = Counter(tokens)
            max_count = max(counts.values())
            for term, count in counts.items():
                idx = self.vocabulary.get(term)
                if idx is not None:
                    tf = 0.5 + 0.5 * (count / max_count)  # augmented term frequency
                    vectors[row, idx] = tf * self.idf[idx]
        return _l2_normalize(vectors)

    def fit_transform(self, documents: list[str]) -> np.ndarray:
        self.fit(documents)
        return self.transform(documents)


def _l2_normalize(matrix: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return matrix / norms


def cosine_similarity(query_vec: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    return matrix @ query_vec
