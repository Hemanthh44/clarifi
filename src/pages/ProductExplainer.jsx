import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  FileSearch,
  FileText,
  ListChecks,
  Loader2,
  MessageCircle,
  Scale,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import AppLayout from "../layouts/AppLayout";
import { Card, Badge, ComplianceBadge } from "../components/Basics";
import { UserBubble, AnswerMessage } from "../components/ChatMessage";
import { askProductExplainer, listDocuments, uploadDocument } from "../lib/api";

const actions = [
  {
    id: "ask",
    label: "Analyze Product",
    icon: MessageCircle,
    prompt: "What are the major structural risks and hidden exclusions in this financial product?",
  },
  {
    id: "summarize",
    label: "Executive Summary",
    icon: Sparkles,
    prompt: "Summarize the essential information, fee structures, and lock-ins for this financial product.",
  },
  {
    id: "risks",
    label: "Risk & Drawdowns",
    icon: ListChecks,
    prompt: "What are the specific risk categories, volatility warnings, and credit risks documented here?",
  },
  {
    id: "compare",
    label: "Comparative Factors",
    icon: Scale,
    prompt: "What benchmark metrics and comparable asset classes should I evaluate before allocating capital here?",
  },
];

export default function ProductExplainer() {
  const fileInputRef = useRef(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [document, setDocument] = useState(null);

  useEffect(() => {
    let active = true;
    listDocuments()
      .then((data) => {
        if (!active) return;
        const docs = data.documents || [];
        if (docs.length) setDocument(docs[docs.length - 1]);
      })
      .catch(() => {
        // Empty state remains usable if document library is unavailable
      });
    return () => {
      active = false;
    };
  }, []);

  const handleAsk = async (text, action = "ask") => {
    if (!text?.trim() || loading || !document?.id) return;

    setQuestion(text.trim());
    setLoading(true);
    setAnswer(null);
    setError("");

    try {
      const response = await askProductExplainer(text.trim(), {
        documentId: document.id,
        action,
      });

      setAnswer({
        answer: response.answer || "",
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
      });
    } catch (err) {
      setError(err.message || "Something went wrong while analyzing the document.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowed = [".pdf", ".txt", ".md"];
    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;

    if (!allowed.includes(extension)) {
      setError("Please upload a PDF, TXT, or Markdown document.");
      return;
    }

    setUploading(true);
    setError("");
    setAnswer(null);
    setQuestion("");

    try {
      const uploaded = await uploadDocument(file, "Product Explainer");
      setDocument(uploaded);
    } catch (err) {
      setError(err.message || "Document upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const clearDocument = () => {
    if (loading || uploading) return;
    setDocument(null);
    setAnswer(null);
    setQuestion("");
    setError("");
  };

  const runAction = (action) => {
    const selected = actions.find((item) => item.id === action);
    if (selected) handleAsk(selected.prompt, selected.id);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        {/* Sticky Header */}
        <header className="border-b border-[#EDE7EB] bg-white/90 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-roseLight border border-brand-roseBorder flex items-center justify-center shrink-0 shadow-subtle">
                <FileSearch size={18} className="text-brand-berry" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                    Product Explainer
                  </h1>
                  <Badge tone="accent">Citation Grounded</Badge>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Decode fund prospectuses, SID documents, and terms without the jargon.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {document && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <CheckCircle2 size={13} className="text-emerald-700" />
                  <span>Document active</span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                onChange={handleUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleUploadClick}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-full bg-brand-berry px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-brand-berryDark transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                <span>{uploading ? "Indexing..." : "Upload document"}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-5 sm:p-8">
          {/* Intro Hero Banner when no document selected */}
          {!document && (
            <Card className="mb-8 overflow-hidden bg-white border border-[#EDE7EB] shadow-subtle p-8 sm:p-10 rounded-2xl">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="max-w-2xl">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-berry block mb-2">
                    FINANCIAL RESEARCH INTERFACE
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
                    Understand what you&apos;re buying.
                  </h2>
                  <p className="text-sm sm:text-base text-text-secondary leading-relaxed mt-3">
                    Upload a Scheme Information Document, fund factsheet, bond indenture, or policy agreement.
                    ClariFi analyzes exit loads, management expense ratios, asset exclusions, and downside risks.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-text-muted font-medium">
                    <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-700" /> 100% Grounded</span>
                    <span className="inline-flex items-center gap-1.5"><FileText size={14} className="text-brand-berry" /> PDF / TXT / Markdown</span>
                    <span className="inline-flex items-center gap-1.5"><ArrowUpRight size={14} /> Page & section citations</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="w-full lg:w-auto shrink-0 inline-flex items-center justify-center gap-2.5 rounded-full border border-[#EDE7EB] bg-[#FAF7F9] px-6 py-3.5 text-sm font-semibold text-text-primary hover:border-brand-berry hover:text-brand-berry hover:bg-white transition-all shadow-sm"
                >
                  <Upload size={16} />
                  Choose document to inspect
                </button>
              </div>
            </Card>
          )}

          {/* Research Grid */}
          <div className="grid xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)] gap-6">
            {/* Left: Source Document & Analytical Actions */}
            <section className="min-w-0">
              <Card className="h-full flex flex-col bg-white border border-black/[0.08] shadow-subtle rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#EDE7EB] flex items-center justify-between gap-3 bg-[#FAF7F9]">
                  <div>
                    <p className="text-[0.68rem] font-mono font-semibold tracking-wider text-[#52586B] uppercase">
                      REFERENCE DOCUMENT
                    </p>
                    <p className="text-sm font-display font-semibold text-[#181A2A] mt-0.5">Underlying Source</p>
                  </div>
                  {document && (
                    <button
                      type="button"
                      onClick={clearDocument}
                      className="p-1.5 rounded-full text-[#52586B] hover:text-[#181A2A] hover:bg-brand-roseLight transition"
                      aria-label="Remove document"
                      title="Remove document"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  {document ? (
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-[#EDE7EB] bg-[#FAF7F9] p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-brand-roseLight border border-brand-roseBorder flex items-center justify-center shrink-0 shadow-sm">
                            <FileText size={20} className="text-brand-berry" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-display text-base font-bold text-[#181A2A] truncate" title={document.name}>
                              {document.name}
                            </h3>
                            <p className="text-xs font-mono text-text-muted mt-1">
                              {document.pages || 1} {document.pages === 1 ? "page" : "pages"} · {document.category}
                            </p>
                            {document.ml_category && document.ml_category !== "Other" && (
                              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#FF7A45] mt-2">
                                <span>Classified: {document.ml_category}</span>
                                {document.ml_confidence != null && (
                                  <span className="text-text-muted">
                                    ({Math.round(document.ml_confidence * 100)}%)
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-800 mt-2.5">
                              <CheckCircle2 size={13} /> Indexed in vector store
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-[0.65rem] font-mono font-semibold tracking-wider text-text-muted uppercase mb-3">
                          RESEARCH PERSPECTIVES
                        </p>
                        <div className="grid gap-2">
                          {actions.map((action) => {
                            const Icon = action.icon;
                            return (
                              <button
                                key={action.id}
                                type="button"
                                onClick={() => runAction(action.id)}
                                disabled={loading}
                                className="group flex items-center gap-3.5 text-left rounded-xl border border-black/[0.06] bg-[#FAF8F5] px-4 py-3 hover:border-black hover:bg-white transition-all disabled:opacity-50"
                              >
                                <span className="w-8 h-8 rounded-lg bg-white border border-black/[0.06] flex items-center justify-center group-hover:border-black transition">
                                  <Icon size={15} className="text-text-muted group-hover:text-text-primary" />
                                </span>
                                <span className="text-xs font-mono font-medium text-text-secondary group-hover:text-text-primary">
                                  {action.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-xl border border-black/[0.06] bg-[#FAF8F5] p-4 text-xs font-mono text-text-muted">
                        <div className="flex items-center gap-2 mb-1.5 text-emerald-800 font-semibold">
                          <ShieldCheck size={14} /> Explainability Guardrail
                        </div>
                        Answers are grounded strictly in the indexed text and presented as educational research,
                        not personalized advice.
                      </div>
                    </div>
                  ) : (
                    <div className="min-h-[420px] flex flex-col items-center justify-center text-center px-4">
                      <div className="w-14 h-14 rounded-2xl border border-dashed border-[#EDE7EB] bg-[#FAF7F9] flex items-center justify-center mb-4">
                        <Upload size={22} className="text-brand-berry" />
                      </div>
                      <h3 className="font-display text-xl font-bold text-[#181A2A]">No document loaded</h3>
                      <p className="text-xs text-[#52586B] leading-relaxed max-w-xs mt-2 font-sans">
                        Upload a prospectus or financial agreement to activate grounded explanation extraction.
                      </p>
                      <button
                        type="button"
                        onClick={handleUploadClick}
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-berry px-5 py-2.5 text-xs font-medium text-white hover:bg-brand-berryDark shadow-sm transition-all"
                      >
                        <Upload size={13} />
                        Choose document
                      </button>
                      <p className="text-[0.68rem] font-mono text-[#52586B] mt-2.5">PDF, TXT, or Markdown · Max 25 MB</p>
                    </div>
                  )}
                </div>
              </Card>
            </section>

            {/* Right: Synthesis & Grounded Analysis */}
            <section className="min-w-0">
              <Card className="min-h-[640px] h-full flex flex-col bg-white border border-[#EDE7EB] shadow-sm rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#EDE7EB] flex items-center justify-between gap-4 bg-[#FAF7F9]">
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-mono font-semibold tracking-wider text-[#52586B] uppercase">
                      CLARIFI RESEARCH OUTPUT
                    </p>
                    <p className="text-sm font-display font-semibold text-[#181A2A] mt-0.5 truncate">
                      {document ? document.name : "Select or upload a document to proceed"}
                    </p>
                  </div>
                  {answer && <ComplianceBadge />}
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  {!document && !error && (
                    <div className="min-h-[460px] flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-2xl bg-brand-roseLight border border-brand-roseBorder flex items-center justify-center mb-3">
                        <Sparkles size={18} className="text-brand-berry" />
                      </div>
                      <h3 className="font-display text-2xl font-bold text-[#181A2A] tracking-tight">
                        Your explanation will appear here
                      </h3>
                      <p className="text-xs text-[#52586B] mt-2 max-w-sm leading-relaxed font-sans">
                        Upload a fund document, then ask specific questions regarding fees, lock-ins, or risks.
                      </p>
                    </div>
                  )}

                  {document && !question && !loading && !answer && !error && (
                    <div className="min-h-[460px] flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-2xl bg-brand-roseLight border border-brand-roseBorder flex items-center justify-center mb-4">
                        <MessageCircle size={20} className="text-brand-berry" />
                      </div>
                      <h3 className="font-display text-2xl font-bold text-[#181A2A] tracking-tight">
                        Ready to analyze {document.name}
                      </h3>
                      <p className="text-xs text-[#52586B] mt-2 max-w-md leading-relaxed font-sans">
                        Type an inquiry in the prompt bar below, or select a perspective from the left sidebar.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 mt-6">
                        {actions.slice(0, 3).map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            onClick={() => runAction(action.id)}
                            className="text-xs font-mono text-[#52586B] border border-[#EDE7EB] bg-white rounded-full px-4 py-2 hover:border-brand-roseBorder hover:text-brand-berry hover:bg-brand-roseLight transition"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="max-w-3xl mx-auto space-y-6">
                    {question && <UserBubble text={question} />}

                    {loading && (
                      <Card className="p-6 bg-[#FAF8F5] border border-black/[0.08]">
                        <div className="flex items-center gap-3">
                          <Loader2 size={18} className="text-[#FF7A45] animate-spin" />
                          <div>
                            <p className="text-xs font-mono font-semibold text-text-primary uppercase">
                              Analyzing Document Vectors
                            </p>
                            <p className="text-xs text-text-muted mt-0.5 font-sans">
                              Retrieving relevant citations and compiling grounded synthesis...
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {!loading && answer && <AnswerMessage data={answer} />}

                    {!loading && error && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex gap-3 text-red-900">
                        <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-xs font-mono">Analysis Notice</p>
                          <p className="text-xs font-sans mt-1 leading-relaxed">{error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Question Input Console */}
                <div className="border-t border-black/[0.07] p-5 bg-[#FAF8F5]">
                  <div className="max-w-3xl mx-auto">
                    <div className={`flex items-end gap-2 rounded-2xl border bg-white p-2.5 transition-all ${
                      document
                        ? "border-black/[0.1] focus-within:border-black focus-within:shadow-subtle"
                        : "border-black/[0.06] opacity-60"
                    }`}>
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAsk(question, "ask");
                          }
                        }}
                        disabled={!document || loading}
                        rows={1}
                        placeholder={
                          document
                            ? "Ask anything about this financial product's fine print..."
                            : "Upload a document to activate questions"
                        }
                        className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none min-h-[40px] max-h-28 font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => handleAsk(question, "ask")}
                        disabled={!document || !question.trim() || loading}
                        className="shrink-0 inline-flex items-center justify-center rounded-xl bg-[#171717] w-9 h-9 text-white hover:bg-black transition disabled:opacity-40"
                        aria-label="Ask"
                      >
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowUpRight size={16} />}
                      </button>
                    </div>
                    <p className="text-[0.68rem] font-mono text-text-muted text-center mt-2.5">
                      Enter to analyze · Shift + Enter for newline · Grounded in document pages
                    </p>
                  </div>
                </div>
              </Card>
            </section>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
