import { useEffect, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import { Search, Clock } from "lucide-react";
import { Card } from "../components/Basics";
import { HistoryItem } from "../components/DocumentCard";
import { getHistory } from "../lib/api";

export default function History() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory()
      .then((data) => setItems(data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((x) => x.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="cf-eyebrow mb-1">AUDIT &amp; RESEARCH LOG</p>
            <h1 className="text-3xl font-bold text-text-primary">Research History</h1>
            <p className="text-sm text-text-secondary mt-1">
              Chronological log of past agent inquiries, document explanations, and scam screens.
            </p>
          </div>

          <div className="relative w-full sm:w-auto">
            <Search size={14} className="absolute left-3.5 top-3 text-text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search inquiries..."
              className="w-full sm:w-60 cf-input pl-9 pr-3.5 py-2 text-xs text-text-primary outline-none"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-text-muted py-12 text-center">Loading inquiry log...</p>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center bg-white border border-[#EDE7EB] shadow-subtle rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-brand-roseLight border border-brand-roseBorder flex items-center justify-center mx-auto mb-3">
              <Clock size={20} className="text-brand-berry" />
            </div>
            <p className="text-xl font-bold text-text-primary">No inquiry records found</p>
            <p className="text-xs text-text-muted mt-1.5">
              Your completed inquiries with Ask ClariFi and Product Explainer will be archived here.
            </p>
          </Card>
        ) : (
          <Card className="p-3 bg-white border border-black/[0.08] shadow-subtle rounded-2xl divide-y divide-black/[0.05]">
            {filtered.map((x) => (
              <div key={x.id} className="p-1">
                <HistoryItem item={x} />
              </div>
            ))}
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
