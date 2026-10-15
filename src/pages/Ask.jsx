import { useState, useRef, useEffect } from "react";
import { Paperclip, ArrowUp, Plus, Globe2, ImagePlus } from "lucide-react";
import AppLayout from "../layouts/AppLayout";
import { useNavigate } from "react-router-dom";
import { getHistory } from "../lib/api";
import { askClarifi, analyzeImage } from "../lib/api";
import { HistoryItem } from "../components/DocumentCard";
import {
  UserBubble,
  AnswerMessage,
  AgentActivityPanel,
} from "../components/ChatMessage";
import { LoadingState } from "../components/States";
import Button from "../components/Button";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export default function Ask() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [imageAnalyzing, setImageAnalyzing] = useState(false);
  const scrollRef = useRef(null);
  const imageInputRef = useRef(null);

  useEffect(() => {
    getHistory().then(setHistory).catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    // Show user's question immediately
    setMessages((m) => [...m, { type: "user", text: question }]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await askClarifi(question, {
        webSearch: webSearch ? true : null,
      });

      const answerData = {
        answer: response.answer,
        explanation: response.explanation || null,
        keyTakeaways: response.key_points || [],
        whyItMatters: response.why_it_matters || null,
        risks: response.risks || [],
        nextSteps: response.next_steps || [],
        evidenceStrength: response.evidence_strength || null,
        sources: response.sources || [],
        retrievalTrail: (response.trace || []).map(
          (step) => `${step.agent}: ${step.action}`
        ),
      };

      setMessages((m) => [
        ...m,
        {
          type: "answer",
          data: answerData,
        },
      ]);
    } catch (err) {
      console.error("ClariFi Ask error:", err);
      setError(
        err.message ||
          "Unable to connect to the ClariFi backend. Make sure the FastAPI server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Unsupported image type. Upload PNG, JPG, JPEG, or WEBP.");
      return;
    }

    const question = input.trim();
    setMessages((m) => [
      ...m,
      { type: "user", text: question ? `📷 ${file.name} — ${question}` : `📷 ${file.name}` },
    ]);
    setInput("");
    setError("");
    setImageAnalyzing(true);

    try {
      const result = await analyzeImage(file, question);
      const extracted = Object.entries(result.extracted_values || {});
      setMessages((m) => [
        ...m,
        {
          type: "answer",
          data: {
            answer: result.analysis,
            evidenceStrength: result.readability,
            keyTakeaways: extracted.map(([label, value]) => `${label}: ${value}`),
            risks: result.warnings || [],
            sources: [],
          },
        },
      ]);
    } catch (err) {
      setError(err.message || "Couldn't analyze that image.");
    } finally {
      setImageAnalyzing(false);
    }
  };

  const newConversation = () => {
    setMessages([]);
    setInput("");
    setError("");
  };

  return (
    <AppLayout>
      <div className="flex h-screen bg-[#F5F3EE]">
        {/* Conversation history sidebar */}
        <div className="hidden lg:flex flex-col w-72 border-r border-black/[0.07] bg-[#FAF8F5]/80 shrink-0 py-6 px-4 overflow-y-auto no-scrollbar">
          <div className="mb-6">
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              className="w-full justify-center text-xs font-mono"
              onClick={newConversation}
            >
              New inquiry
            </Button>
          </div>

          <p className="text-[0.65rem] font-mono font-semibold tracking-wider text-text-muted uppercase mb-3 px-2">
            RESEARCH SESSIONS
          </p>

          <div className="flex flex-col gap-1">
            {history.map((h) => (
              <HistoryItem key={h.id} item={h} />
            ))}
          </div>
        </div>

        {/* Main research & chat canvas */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-10 py-8">
            <div className="max-w-3xl mx-auto flex flex-col gap-6">
              {/* Empty state */}
              {messages.length === 0 && !loading && (
                <div className="text-center py-24">
                  <span className="text-xs font-semibold tracking-wider uppercase text-brand-berry block mb-3">
                    CLARIFI MULTI-AGENT COPILOT
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
                    Ask ClariFi anything.
                  </h2>
                  <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                    Queries are automatically routed across the Product Explainer, Deterministic Risk Engine,
                    and Scam Screener.
                  </p>
                </div>
              )}

              {/* Messages stream */}
              {messages.map((m, i) =>
                m.type === "user" ? (
                  <UserBubble key={i} text={m.text} />
                ) : (
                  <AnswerMessage key={i} data={m.data} />
                )
              )}

              {/* Loading indicators */}
              {loading && (
                <div className="flex flex-col gap-3 max-w-[92%]">
                  <LoadingState stage={1} />
                  <AgentActivityPanel done={false} />
                </div>
              )}

              {imageAnalyzing && (
                <div className="flex items-center gap-3 text-text-secondary text-xs font-mono py-3 max-w-[92%]">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A45] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A45] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] animate-bounce" />
                  </span>
                  <span>Extracting visual financial data and fine print...</span>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-mono text-red-900">
                  <p className="font-semibold mb-1">Backend connection notice</p>
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Input console */}
          <div className="border-t border-black/[0.07] px-4 sm:px-10 py-5 bg-[#F5F3EE]/90 backdrop-blur-md">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-2 bg-white border border-black/[0.08] shadow-subtle rounded-2xl p-2.5 focus-within:border-black focus-within:shadow-editorial transition-all">
                <button
                  type="button"
                  onClick={() => navigate("/documents")}
                  className="p-2 text-text-muted hover:text-text-primary transition-colors"
                  aria-label="Open document library"
                  title="Open document library"
                >
                  <Paperclip size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => setWebSearch((enabled) => !enabled)}
                  className={`p-2 rounded-lg transition-colors ${
                    webSearch
                      ? "text-brand-berry bg-brand-roseLight border border-brand-roseBorder"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                  aria-label={webSearch ? "Disable live web search" : "Enable live web search"}
                  title={webSearch ? "Live web search enabled" : "Search live market web data"}
                >
                  <Globe2 size={17} />
                </button>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={imageAnalyzing}
                  className="p-2 text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
                  aria-label="Upload an image to analyze"
                  title="Upload statement or screenshot to analyze"
                >
                  <ImagePlus size={17} />
                </button>

                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Ask ClariFi in natural language..."
                  className="flex-1 resize-none outline-none bg-transparent text-sm text-text-primary placeholder:text-text-muted py-2 max-h-32"
                  disabled={loading}
                />

                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-full bg-brand-berry hover:bg-brand-berryDark disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-sm"
                  aria-label="Send"
                >
                  <ArrowUp size={16} strokeWidth={2.2} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-2.5 px-2">
                <span className="text-[0.68rem] font-mono text-text-muted">
                  {webSearch ? "• Live search active" : "• Document & knowledge grounded"}
                </span>
                <p className="text-[0.68rem] font-mono text-text-muted">
                  Educational & analytical only · Not investment advice
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}