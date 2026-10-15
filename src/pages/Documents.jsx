import { useEffect, useRef, useState } from "react";
import { Library, UploadCloud, Search, FileText, CheckCircle2, Trash2 } from "lucide-react";
import AppLayout from "../layouts/AppLayout";
import { Card, Badge } from "../components/Basics";
import { EmptyState } from "../components/States";
import { listDocuments, uploadDocument, deleteDocument } from "../lib/api";

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef();

  const load = async () => {
    try {
      setLoading(true);
      const res = await listDocuments();
      setDocs(res.documents || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setUploading(true);
      setError("");
      await uploadDocument(f);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const filtered = docs.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));

  const remove = async (id) => {
    if (!window.confirm("Remove this document from your private ClariFi vector index?")) return;
    try {
      setError("");
      await deleteDocument(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="cf-eyebrow mb-1">PRIVATE KNOWLEDGE BASE</p>
            <h1 className="text-3xl font-bold text-text-primary">Financial Documents</h1>
            <p className="text-sm text-text-secondary mt-1">
              Only documents you upload are indexed and retrieved during multi-agent analysis.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search size={14} className="absolute left-3.5 top-3 text-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search archive..."
                className="w-full sm:w-60 cf-input pl-9 pr-3.5 py-2 text-xs text-text-primary outline-none"
              />
            </div>

            <input ref={ref} type="file" accept=".pdf,.txt,.md" hidden onChange={upload} />
            <button
              onClick={() => ref.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-full bg-brand-berry text-white hover:bg-brand-berryDark transition-all px-5 py-2 text-xs font-semibold disabled:opacity-50 shrink-0 shadow-sm"
            >
              <UploadCloud size={15} />
              <span>{uploading ? "Indexing..." : "Upload"}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-mono text-red-900">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-xs font-mono text-text-muted py-12 text-center">Loading document archive...</p>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={Library}
            title="No documents indexed yet"
            description="Upload mutual fund factsheets, policy terms, prospectuses, or bank statements in PDF, TXT, or Markdown format."
            action={
              <button
                onClick={() => ref.current?.click()}
                className="rounded-xl bg-[#171717] text-white px-5 py-2.5 text-xs font-mono hover:bg-black transition-all shadow-sm"
              >
                Upload your first document
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <p className="text-xs font-mono text-text-muted text-center py-20">
            No indexed documents match &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((d) => (
              <Card
                key={d.id}
                className="p-5 flex flex-col justify-between bg-white border border-black/[0.08] shadow-subtle rounded-2xl hover:border-black/[0.2] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-black/[0.07] flex items-center justify-center">
                      <FileText size={18} className="text-[#FF7A45]" />
                    </div>
                    <Badge tone={d.indexed ? "positive" : "warning"}>
                      {d.indexed ? (
                        <>
                          <CheckCircle2 size={11} className="mr-1 inline" /> Indexed
                        </>
                      ) : (
                        "Parsing"
                      )}
                    </Badge>
                  </div>

                  <h3 className="font-display text-base font-bold text-[#181A2A] truncate" title={d.name}>
                    {d.name}
                  </h3>
                  <p className="text-xs font-mono text-[#52586B] mt-1">
                    {d.pages} {d.pages === 1 ? "page" : "pages"} · {d.category}
                  </p>

                  {d.ml_category && d.ml_category !== "Other" && (
                    <div className="mt-2.5">
                      <span className="inline-block text-[0.68rem] font-mono text-brand-berry bg-brand-roseLight border border-brand-roseBorder px-2.5 py-0.5 rounded-full font-semibold">
                        {d.ml_category}
                        {d.ml_confidence != null ? ` · ${Math.round(d.ml_confidence * 100)}% match` : ""}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-3 border-t border-[#EDE7EB] flex items-center justify-between">
                  <span className="text-[0.68rem] font-mono text-[#52586B]">Vectorized for RAG</span>
                  <button
                    onClick={() => remove(d.id)}
                    className="inline-flex items-center gap-1 text-[0.72rem] font-mono text-[#FF3B30] hover:underline"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
