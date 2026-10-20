"""Gemini-backed LLM client for ClariFi.

The LLM is used for intent classification, grounded document answers, web-grounded
answers, and plain-language narration around deterministic financial calculations.
The LLM never computes risk, stress-test, or fraud scores.

If GEMINI_API_KEY is not set (or the Gemini SDK cannot be initialized), the client
falls back to the existing deterministic/template behavior so the backend remains
runnable without an API key.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from app.config import get_settings

logger = logging.getLogger("clarifi.llm")


class LLMClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.model = settings.llm_model
        self.template_mode = not bool(settings.gemini_api_key)
        self._client = None

        if not self.template_mode:
            try:
                from google import genai

                self._client = genai.Client(api_key=settings.gemini_api_key)
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Falling back to template mode: %s", exc)
                self.template_mode = True

    def _generate(
        self,
        *,
        system: str,
        contents: str,
        max_output_tokens: int,
        json_output: bool = False,
    ) -> str:
        """Generate text using the current Gemini model."""
        from google.genai import types

        config_kwargs = {
            "system_instruction": system,
            "max_output_tokens": max_output_tokens,
        }
        if json_output:
            config_kwargs["response_mime_type"] = "application/json"

        import time

        for attempt in range(2):
            try:
                response = self._client.models.generate_content(
                    model=self.model,
                    contents=contents,
                    config=types.GenerateContentConfig(**config_kwargs),
                )
                return (response.text or "").strip()
            except Exception as exc:
                err_str = str(exc)
                if attempt == 0 and ("429" in err_str or "ResourceExhausted" in err_str or "quota" in err_str.lower()):
                    logger.warning("Gemini rate limit hit, backing off briefly: %s", exc)
                    time.sleep(2.0)
                    continue
                raise

    @staticmethod
    def _parse_json(text: str) -> dict:
        """Parse Gemini JSON, tolerating markdown fences and leading/trailing text."""
        cleaned = text.strip()
        if "```" in cleaned:
            start = cleaned.find("```")
            end = cleaned.rfind("```")
            if end > start:
                inner = cleaned[start:end]
                inner_lines = inner.split("\n", 1)
                cleaned = inner_lines[1] if len(inner_lines) > 1 else inner

        first_brace = cleaned.find("{")
        last_brace = cleaned.rfind("}")
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            cleaned = cleaned[first_brace : last_brace + 1]

        return json.loads(cleaned)

    # -- Intent classification (Orchestrator routing) -------------------

    def classify_intent(self, message: str) -> str:
        """Return one of the four specialist agent labels."""
        if self.template_mode:
            return self._classify_intent_rule_based(message)

        system = (
            "You are ClariFi's Orchestrator Agent. Classify the user's request "
            "into exactly one specialist: product_explainer, risk_simulator, "
            "summary_agent, or scam_screener. Reply with only the label."
        )
        try:
            label = self._generate(
                system=system,
                contents=message,
                max_output_tokens=20,
            ).strip().lower()
            if label in {"product_explainer", "risk_simulator", "summary_agent", "scam_screener"}:
                return label
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Gemini classify_intent failed, using rules: %s", exc)
        return self._classify_intent_rule_based(message)

    @staticmethod
    def _classify_intent_rule_based(message: str) -> str:
        text = message.lower()
        if any(w in text for w in ["scam", "fraud", "whatsapp", "telegram", "suspicious", "guaranteed return"]):
            return "scam_screener"
        if any(w in text for w in ["stress test", "crash", "2008", "2020", "2013", "risk score", "volatility", "drawdown"]):
            return "risk_simulator"
        if any(w in text for w in ["summary", "snapshot", "overview", "at a glance", "goal"]):
            return "summary_agent"
        return "product_explainer"

    # -- Grounded narration (Product Explainer) --------------------------

    def narrate_grounded_answer(self, question: str, chunks: list[dict]) -> dict:
        if self.template_mode or not chunks:
            return self._narrate_grounded_template(question, chunks)

        context = "\n\n".join(f"[{c['doc']} p.{c['page']}] {c['text']}" for c in chunks)
        system = (
            "You are ClariFi's Product Explainer, a financial explanation assistant. "
            "Use the retrieved context as evidence, but do not simply repeat it. First "
            "understand the user's question, then answer it directly. Explain financial "
            "terminology in simple language, as you would to a college student or a "
            "first-time investor. If the retrieved information does not contain enough "
            "evidence, clearly say the available information is insufficient instead of "
            "inventing information. Separate facts from interpretation. Never fabricate "
            "numbers, returns, risks, fees, dates, regulations, or company information. "
            "Never give buy/sell advice.\n\n"
            "Return JSON with exactly these fields:\n"
            '{"answer": "1-2 sentence direct answer to the question",\n'
            ' "explanation": "a short plain-language explanation, 2-4 sentences",\n'
            ' "key_points": ["3-6 important facts or numbers, each one sentence"],\n'
            ' "why_it_matters": "1-2 sentences on what this means for the investor",\n'
            ' "risks": ["0-4 relevant risks or limitations, only if the document supports them"],\n'
            ' "next_steps": ["0-3 concrete things the user could check or do next"]}\n'
            "Every field must be filled even if some arrays are empty. Keep the whole "
            "response concise and skimmable — short sentences, no repetition."
        )
        try:
            data = self._parse_json(
                self._generate(
                    system=system,
                    contents=f"Question: {question}\n\nExcerpts:\n{context}",
                    max_output_tokens=1500,
                    json_output=True,
                )
            )
            answer = data.get("answer") or data.get("direct_answer") or data.get("summary")
            key_points = data.get("key_points") or data.get("key_takeaways") or data.get("points")
            if answer and key_points:
                data["answer"] = answer
                data["key_points"] = key_points
                return self._normalize_structured(data)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Gemini narrate_grounded_answer failed, using template: %s", exc)
        return self._narrate_grounded_template(question, chunks)

    @staticmethod
    def _normalize_structured(data: dict) -> dict:
        """Fill in any fields the model omitted so callers can rely on the
        full structured shape regardless of which path produced it."""
        return {
            "answer": data.get("answer", "").strip(),
            "explanation": (data.get("explanation") or "").strip() or None,
            "key_points": [p for p in data.get("key_points", []) if p],
            "why_it_matters": (data.get("why_it_matters") or "").strip() or None,
            "risks": [r for r in data.get("risks", []) if r],
            "next_steps": [s for s in data.get("next_steps", []) if s],
        }

    @staticmethod
    def _narrate_grounded_template(question: str, chunks: list[dict]) -> dict:
        """Template-mode fallback (no GEMINI_API_KEY configured).

        This used to just dump the first retrieved chunk's raw text —
        exactly the "unclear answer" problem. It now builds an honestly
        extractive but genuinely structured answer: a direct-answer
        sentence pulled from the strongest-scoring chunk, key facts from
        the rest, and a plain note that this is template mode (no LLM
        available to synthesize/explain further) rather than pretending
        to be a full explanation.
        """
        if not chunks:
            return {
                "answer": "ClariFi couldn't find a document section that directly answers this.",
                "explanation": "Try rephrasing the question, or upload the document this question is about.",
                "key_points": [],
                "why_it_matters": None,
                "risks": [],
                "next_steps": ["Rephrase the question with more specific terms.", "Upload the relevant document if it hasn't been added yet."],
            }

        def first_sentence(text: str, limit: int = 240, min_len: int = 20) -> str:
            """Grabs the first genuine sentence, skipping short heading-style
            fragments like 'Exit Load.' that end in a period but aren't
            actually an answer on their own."""
            text = text.strip()
            for end in (". ", "? ", "! "):
                idx = text.find(end)
                while 0 <= idx < limit:
                    if idx >= min_len:
                        return text[: idx + 1].strip()
                    idx = text.find(end, idx + 1)
            return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"

        top = chunks[0]
        direct_answer = first_sentence(top["text"])
        key_points = [first_sentence(c["text"], 160) for c in chunks[1:5]]

        settings = get_settings()
        if settings.gemini_api_key:
            explanation = (
                f"This is the most relevant passage found in {top['doc']} (page {top['page']}) "
                "for your question. Live LLM synthesis was temporarily unavailable, so ClariFi is "
                "showing the strongest matching excerpt directly."
            )
            next_steps = ["Try asking again in a few moments or rephrase your question."]
        else:
            explanation = (
                f"This is the most relevant passage found in {top['doc']} (page {top['page']}) "
                "for your question. No LLM is configured right now (GEMINI_API_KEY is unset), so "
                "ClariFi is showing the strongest matching excerpt directly rather than "
                "synthesizing a fuller explanation."
            )
            next_steps = ["Set GEMINI_API_KEY in backend/.env for fuller, synthesized explanations."]

        return {
            "answer": direct_answer,
            "explanation": explanation,
            "key_points": key_points,
            "why_it_matters": None,
            "risks": [],
            "next_steps": next_steps,
        }

    # -- Live web answer narration ----------------------------------------

    def narrate_web_answer(
        self,
        question: str,
        sources: list[dict],
        tavily_answer: str | None = None,
    ) -> dict:
        """Answer a current question using only retrieved web sources."""
        if self.template_mode:
            return self._narrate_web_template(question, sources, tavily_answer)

        context = "\n\n".join(
            f"[{i + 1}] {item['title']} | {item['url']}\n{item.get('content', '')}"
            for i, item in enumerate(sources)
        )
        system = (
            "You are ClariFi, a financial information assistant. Answer the user's "
            "question using the retrieved web sources below.\n\n"
            "IMPORTANT:\n"
            "- Prefer authoritative and primary sources.\n"
            "- Do not invent facts.\n"
            "- Do not claim information is current unless supported by the retrieved sources.\n"
            "- If sources disagree, explicitly mention the disagreement.\n"
            "- Distinguish facts from interpretation.\n"
            "- For financial information, clearly state when information may change.\n"
            "- Do not provide personalized financial advice or buy/sell recommendations.\n"
            "- If the retrieved sources do not contain enough information, say so.\n\n"
            "Cite factual claims inline using [1], [2], etc., matching the source numbers given.\n\n"
            "Return JSON with exactly these fields:\n"
            '{"answer": "1-2 sentence direct answer, with [n] citations",\n'
            ' "explanation": "2-4 sentences of plain-language context",\n'
            ' "key_points": ["3-6 concrete facts/figures with [n] citations"],\n'
            ' "why_it_matters": "1-2 sentences on relevance to the user",\n'
            ' "risks": ["0-3 caveats, e.g. figures that may change, or source disagreement"],\n'
            ' "next_steps": ["0-2 things the user could verify or check next"]}\n'
            "Every field must be filled even if some arrays are empty."
        )
        try:
            data = self._parse_json(
                self._generate(
                    system=system,
                    contents=f"Question: {question}\n\nWeb sources:\n{context}",
                    max_output_tokens=900,
                    json_output=True,
                )
            )
            if isinstance(data.get("answer"), str) and isinstance(data.get("key_points"), list):
                return self._normalize_structured(data)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Gemini narrate_web_answer failed, using source template: %s", exc)
        return self._narrate_web_template(question, sources, tavily_answer)

    @staticmethod
    def _narrate_web_template(question: str, sources: list[dict], tavily_answer: str | None = None) -> dict:
        if not sources:
            return {
                "answer": "I could not find reliable live web sources for that question.",
                "explanation": "Live web search returned no usable results, so no answer can be grounded here.",
                "key_points": [],
                "why_it_matters": None,
                "risks": [],
                "next_steps": ["Try rephrasing the question, or check again shortly."],
            }

        def clip(text: str, limit: int = 220) -> str:
            text = (text or "").strip().replace("\n", " ")
            return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"

        if tavily_answer:
            direct_answer = tavily_answer.strip()
        else:
            direct_answer = clip(sources[0].get("content", ""), 240)

        key_points = [
            f"{clip(item.get('content', ''), 160)} — {item['title']} ({item['domain']})"
            for item in sources[:5]
            if item.get("content")
        ]

        settings = get_settings()
        explanation = (
            "Live LLM synthesis was temporarily unavailable, so this is drawn directly "
            "from the retrieved web sources rather than synthesized further."
            if settings.gemini_api_key
            else "No LLM is configured right now (GEMINI_API_KEY is unset), so this is drawn "
            "directly from the retrieved web sources rather than synthesized further."
        )

        return {
            "answer": direct_answer,
            "explanation": explanation,
            "key_points": key_points,
            "why_it_matters": None,
            "risks": ["Figures and rates in these sources can change — check the publish date before relying on them."],
            "next_steps": [],
        }

    # -- Image analysis (multimodal) ---------------------------------------

    def analyze_image(self, image_bytes: bytes, mime_type: str, question: str | None = None) -> dict:
        """Analyze an uploaded image (portfolio screenshot, chart, statement,
        suspicious message screenshot, etc.) using Gemini's multimodal input.

        Returns {readable, readability, analysis, extracted_values, warnings}.
        In template mode (no GEMINI_API_KEY), this is honest about not being
        able to read the image rather than inventing values — image
        understanding genuinely requires a multimodal model.
        """
        if self.template_mode:
            return {
                "readable": False,
                "readability": "Low",
                "analysis": (
                    "Image analysis needs a multimodal LLM, which isn't configured right now "
                    "(GEMINI_API_KEY is unset). ClariFi can't reliably read this image without it, "
                    "so it isn't reporting any values from it."
                ),
                "extracted_values": {},
                "warnings": ["No multimodal model is configured — set GEMINI_API_KEY to enable image analysis."],
            }

        from google.genai import types

        system = (
            "You are ClariFi's Image/Document Analysis Agent. The user has uploaded an image — "
            "possibly a portfolio screenshot, a stock/fund chart, a financial statement, or a "
            "screenshot of a suspicious investment message. Identify what is actually visible: "
            "stock prices, percentages, portfolio allocation, financial tables, chart trends, "
            "warning signs, or suspicious claims. Never invent values you cannot actually read "
            "in the image. If the image quality or resolution is not sufficient to reliably read "
            "specific values, say so explicitly instead of guessing.\n\n"
            "Return JSON with exactly:\n"
            '{"readable": true/false,\n'
            ' "readability": "High" | "Medium" | "Low",\n'
            ' "analysis": "2-4 sentences describing what the image shows and what it means",\n'
            ' "extracted_values": {"<label>": "<value>", ...},\n'
            ' "warnings": ["any caveats about readability or things that look off"]}'
        )
        user_text = question or "Analyze this image and explain what it shows."
        try:
            response = self._client.models.generate_content(
                model=self.model,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    user_text,
                ],
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    max_output_tokens=600,
                    response_mime_type="application/json",
                ),
            )
            data = self._parse_json((response.text or "").strip())
            return {
                "readable": bool(data.get("readable", False)),
                "readability": data.get("readability", "Low"),
                "analysis": data.get("analysis", ""),
                "extracted_values": data.get("extracted_values", {}) or {},
                "warnings": data.get("warnings", []) or [],
            }
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Gemini analyze_image failed: %s", exc)
            return {
                "readable": False,
                "readability": "Low",
                "analysis": "ClariFi couldn't analyze this image right now — the vision request failed. Please try again.",
                "extracted_values": {},
                "warnings": [f"Image analysis error: {exc}"],
            }



    def narrate_portfolio_summary(self, portfolio: dict) -> dict:
        if self.template_mode:
            return self._narrate_portfolio_template(portfolio)

        system = (
            "You are ClariFi's Summary Agent. Given portfolio metrics, produce a one-page "
            "goal-linked snapshot. NEVER give buy/sell recommendations — use language like "
            "'currently has', 'this exposes you to', 'a key consideration is'. Return JSON "
            "with exactly {\"headline\": string, \"observations\": string[]} with 3-5 observations."
        )
        try:
            data = self._parse_json(
                self._generate(
                    system=system,
                    contents=json.dumps(portfolio),
                    max_output_tokens=400,
                    json_output=True,
                )
            )
            if "headline" in data and "observations" in data:
                return data
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Gemini narrate_portfolio_summary failed, using template: %s", exc)
        return self._narrate_portfolio_template(portfolio)

    @staticmethod
    def _narrate_portfolio_template(portfolio: dict) -> dict:
        equity_pct = next((a["value"] for a in portfolio["assetMix"] if a["label"] == "Equity"), 0)
        return {
            "headline": f"Your portfolio carries a {portfolio['riskLabel'].lower()} risk profile.",
            "observations": [
                f"Your portfolio currently has {equity_pct}% allocated to equity, {'above' if equity_pct > 55 else 'near'} the moderate-risk average.",
                "This allocation exposes you to greater short-term volatility during market downturns.",
                "A key consideration is your concentration in a small number of sectors.",
                "Historically, portfolios with similar exposure experienced deeper drawdowns during the 2008 and 2020 shocks — see the Stress-Test Time Machine for details.",
            ],
        }

    # -- Stress test narration ---------------------------------------------

    def narrate_stress_test(self, scenario: dict, result: dict) -> str:
        if self.template_mode:
            return self._narrate_stress_test_template(scenario, result)

        system = (
            "You are ClariFi's Risk Simulator. Given a historical shock scenario and "
            "deterministic engine output, write a 2-3 sentence plain-language narration. "
            "Never give buy/sell advice. Respond with plain text only, no JSON."
        )
        try:
            return self._generate(
                system=system,
                contents=json.dumps({"scenario": scenario, "result": result}),
                max_output_tokens=200,
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Gemini narrate_stress_test failed, using template: %s", exc)
        return self._narrate_stress_test_template(scenario, result)

    @staticmethod
    def _narrate_stress_test_template(scenario: dict, result: dict) -> str:
        return (
            f"{scenario['name']} was a {scenario['character']}. Portfolios with your allocation saw an "
            f"estimated {result['impact_pct']}% impact and a {result['drawdown_pct']}% maximum drawdown, "
            f"with recovery historically taking around {result['recovery_months']} months."
        )


_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    global _client
    # If uninitialized or currently stuck in template mode, check if a key
    # was configured in .env and reload without needing a server restart.
    if _client is None or _client.template_mode:
        from app.config import reload_settings

        reload_settings()
        candidate = LLMClient()
        if not candidate.template_mode or _client is None:
            _client = candidate
    return _client

