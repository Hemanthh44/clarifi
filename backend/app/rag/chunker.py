"""Document extraction and citation-preserving chunking."""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Chunk:
    doc: str
    category: str
    page: int
    text: str


DOC_HEADER_RE = re.compile(r"===DOC:\s*(?P<doc>[^\s]+)\s+CATEGORY:\s*(?P<category>.+?)===")
PAGE_HEADER_RE = re.compile(r"===PAGE\s+(?P<page>\d+)===" )


def _clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\u00a0", " ")).strip()


def _chunk_page(text: str, max_chars: int = 1500, overlap: int = 180) -> list[str]:
    """Split a PDF page into useful chunks even when the PDF has no blank lines."""
    cleaned = _clean_text(text)
    if not cleaned:
        return []

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    paragraphs = [_clean_text(p) for p in paragraphs if len(_clean_text(p)) >= 20]
    if not paragraphs:
        paragraphs = [cleaned]

    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        candidate = f"{current} {paragraph}".strip()
        if len(candidate) <= max_chars:
            current = candidate
            continue
        if current:
            chunks.append(current)
        if len(paragraph) <= max_chars:
            current = paragraph
        else:
            start = 0
            while start < len(paragraph):
                end = min(start + max_chars, len(paragraph))
                piece = paragraph[start:end].strip()
                if len(piece) >= 20:
                    chunks.append(piece)
                if end >= len(paragraph):
                    break
                start = max(0, end - overlap)
            current = ""
    if current:
        chunks.append(current)
    return chunks


def parse_document(raw_text: str) -> list[Chunk]:
    header_match = DOC_HEADER_RE.search(raw_text)
    if not header_match:
        raise ValueError("Document is missing the ===DOC: ... CATEGORY: ...=== header")
    doc_name = header_match.group("doc")
    category = header_match.group("category").strip()

    chunks: list[Chunk] = []
    pieces = PAGE_HEADER_RE.split(raw_text[header_match.end():])
    it = iter(pieces[1:])
    for page_num_str, page_text in zip(it, it):
        page_num = int(page_num_str)
        for text in _chunk_page(page_text):
            chunks.append(Chunk(doc=doc_name, category=category, page=page_num, text=text))
    return chunks


def load_documents_from_dir(directory: Path) -> list[Chunk]:
    """Load persisted uploads. There is intentionally no bundled demo corpus."""
    chunks: list[Chunk] = []
    for path in sorted(directory.iterdir() if directory.exists() else []):
        if path.is_dir():
            continue
        try:
            if path.suffix.lower() == ".pdf":
                chunks.extend(parse_uploaded_pdf(path.read_bytes(), path.name, category="Uploaded"))
            elif path.suffix.lower() in {".txt", ".md"}:
                raw = path.read_text(encoding="utf-8", errors="ignore")
                if "===DOC:" in raw:
                    chunks.extend(parse_document(raw))
                else:
                    chunks.extend(parse_uploaded_text(raw, path.name, category="Uploaded"))
        except Exception:
            # A single damaged upload should not prevent the backend from starting.
            continue
    return chunks


def parse_uploaded_pdf(file_bytes: bytes, doc_name: str, category: str = "Uploaded") -> list[Chunk]:
    from io import BytesIO
    from pypdf import PdfReader

    reader = PdfReader(BytesIO(file_bytes))
    chunks: list[Chunk] = []
    for page_index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        for paragraph in _chunk_page(text):
            if len(paragraph) >= 20:
                chunks.append(Chunk(doc=doc_name, category=category, page=page_index, text=paragraph))
    return chunks


def parse_uploaded_text(text: str, doc_name: str, category: str = "Uploaded") -> list[Chunk]:
    return [
        Chunk(doc=doc_name, category=category, page=1, text=paragraph)
        for paragraph in _chunk_page(text)
        if len(paragraph) >= 20
    ]
