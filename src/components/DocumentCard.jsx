import { FileText, CheckCircle2, MoreVertical, MessageSquare, MoreHorizontal } from "lucide-react";
import { Card, Badge } from "./Basics";

export function DocumentCard({ doc }) {
  return (
    <Card hover className="p-5 relative group bg-white border border-black/[0.08] shadow-subtle rounded-xl">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-black/[0.07] flex items-center justify-center">
          <FileText size={17} className="text-[#FF7A45]" />
        </div>
        <button
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/[0.05] opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="More"
        >
          <MoreVertical size={15} />
        </button>
      </div>
      <Badge tone="neutral" className="mb-2">{doc.category}</Badge>
      <h3 className="font-medium text-text-primary text-[0.95rem] mb-1.5 truncate" title={doc.name}>
        {doc.name}
      </h3>
      <div className="flex items-center gap-2 text-xs font-mono text-text-muted mb-3">
        <span>{doc.pages} pages</span>
        <span className="w-1 h-1 rounded-full bg-text-muted" />
        <span>Added {doc.addedDaysAgo}d ago</span>
      </div>
      {doc.indexed && (
        <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-700">
          <CheckCircle2 size={13} /> RAG Indexed
        </div>
      )}
    </Card>
  );
}

export function HistoryItem({ item }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className="group flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-black/[0.04] transition-colors border border-transparent hover:border-black/[0.06]"
    >
      <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-black/[0.07] flex items-center justify-center shrink-0 mt-0.5">
        <MessageSquare size={13} className="text-text-muted group-hover:text-text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-primary truncate">{item.title}</p>
        <p className="text-[0.72rem] text-text-muted truncate mt-0.5">{item.preview}</p>
        <p className="text-[0.65rem] font-mono text-text-muted/70 mt-1">{item.date}</p>
      </div>
      <button
        onClick={(e) => e.preventDefault()}
        className="p-1 rounded-md text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="More"
      >
        <MoreHorizontal size={14} />
      </button>
    </a>
  );
}
