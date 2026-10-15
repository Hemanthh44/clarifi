from __future__ import annotations

from app.agents.base import Trace
from app.compliance.guardrail import apply_guardrail
from app.llm.client import get_llm_client
from app.rag.retriever import retrieve
from app.schemas import Source


def handle(
    question: str,
    trace: Trace,
    document_id: str | None = None,
    top_k: int = 4,
    action: str = "ask",
) -> dict:

    # ---------------------------------------
    # 1. RETRIEVE RELEVANT DOCUMENT SECTIONS
    # ---------------------------------------

    trace.log(
        "Product Explainer",
        f"Retrieving relevant sections for action: {action}"
    )

    # For compare, we want slightly more context
    retrieval_k = 6 if action == "compare" else top_k

    chunks = retrieve(
        question,
        top_k=retrieval_k,
        document_filter=document_id,
        action=action,
    )

    trace.log(
        "RAG Engine",
        f"{len(chunks)} relevant source(s) found"
    )

    # ---------------------------------------
    # 2. CREATE ACTION-SPECIFIC INSTRUCTION
    # ---------------------------------------

    if action == "summarize":

        instruction = f"""
You are a financial document summarization assistant.

The user wants a SUMMARY.

Question:
{question}

Using ONLY the retrieved document sections, provide a concise summary of
the financial product.

Focus on:
- What the product/fund is
- Investment objective
- Where it invests
- Risk level
- Important features
- Costs/fees if available
- Important conditions or restrictions

Do NOT give a generic answer.

Return:
1. A concise summary
2. 4-6 important key points

Use only information supported by the retrieved document.
"""

    elif action == "risks":

        instruction = f"""
You are a financial risk analysis assistant.

The user wants to FIND THE KEY RISKS.

Question:
{question}

Using ONLY the retrieved document sections, identify the most important
risks associated with this financial product.

Focus specifically on:
- Market risk
- Interest-rate risk
- Credit/default risk
- Liquidity risk
- Concentration risk
- Operational or regulatory risks
- Any other risk explicitly mentioned in the document

For every important risk:
- Name the risk
- Explain it simply
- Explain why it matters to an investor

Do NOT give a generic product summary.

Return:
1. A risk-focused answer
2. 4-6 key risks

Use only information supported by the retrieved document.
"""

    elif action == "compare":

        instruction = f"""
You are a financial product comparison assistant.

The user wants to COMPARE the important factors of this financial product.

Question:
{question}

Using ONLY the retrieved document sections, organize the information into
important comparison categories.

Focus on:
- Investment objective
- Asset allocation
- Risk
- Returns/yield information if available
- Fees/expenses
- Minimum investment
- Liquidity/redemption
- Investment horizon
- Suitable investor profile
- Important restrictions

Clearly distinguish between:
- What the document explicitly states
- What information is not available

Do NOT invent another financial product or make up comparison data.

Return:
1. A comparison-oriented explanation
2. 4-6 important comparison factors

Use only information supported by the retrieved document.
"""

    else:

        instruction = f"""
You are a financial product explainer.

Answer the user's question using ONLY the retrieved document sections.

Question:
{question}

Provide:
1. A clear direct answer
2. 4-6 useful key points

Explain financial terminology in simple language.

Do not invent information that is not present in the document.
"""

    # ---------------------------------------
    # 3. CALL LLM
    # ---------------------------------------

    trace.log(
        "Product Explainer",
        f"Generating {action}-focused response"
    )

    llm = get_llm_client()

    narration = llm.narrate_grounded_answer(
        instruction,
        chunks
    )

    trace.log(
        "LLM",
        f"Generated {action}-focused grounded answer"
    )

    # ---------------------------------------
    # 4. COMPLIANCE CHECK
    # ---------------------------------------

    answer, meta = apply_guardrail(
        narration["answer"],
        has_sources=bool(chunks)
    )

    trace.log(
        "Compliance Guard",
        "Response verified"
    )

    # ---------------------------------------
    # 5. SOURCES
    # ---------------------------------------

    sources = [
        Source(
            doc=c["doc"],
            page=c["page"],
            section=c.get("category"),
            snippet=c["text"][:220],
        )
        for c in chunks
    ]

    # ---------------------------------------
    # 6. EVIDENCE STRENGTH
    # ---------------------------------------
    # A simple, honest signal for the frontend: how strong is the retrieval
    # match behind this answer? Based on the top chunk's cosine-similarity
    # score (see app/rag/vector_store.py), not on the LLM's own confidence,
    # since the LLM has no way to know how well-matched its context was.
    top_score = max((c.get("score", 0) for c in chunks), default=0)
    if not chunks:
        evidence_strength = None
    elif top_score >= 0.35:
        evidence_strength = "High"
    elif top_score >= 0.15:
        evidence_strength = "Medium"
    else:
        evidence_strength = "Low"

    # ---------------------------------------
    # 7. RETURN RESPONSE
    # ---------------------------------------

    return {
        "answer": answer,
        "key_points": narration.get("key_points", []),
        "sources": sources,
        "compliance": meta,
        "explanation": narration.get("explanation"),
        "why_it_matters": narration.get("why_it_matters"),
        "risks": narration.get("risks", []),
        "next_steps": narration.get("next_steps", []),
        "evidence_strength": evidence_strength,
    }