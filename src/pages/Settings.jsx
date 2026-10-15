import { useNavigate } from "react-router-dom";
import { SlidersHorizontal, LogOut } from "lucide-react";
import AppLayout from "../layouts/AppLayout";
import { Card, Avatar, Disclaimer, PageHeader, Badge } from "../components/Basics";
import Button from "../components/Button";
import { useAuth } from "../lib/auth";

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-mono font-semibold tracking-wider text-text-muted uppercase mb-3 px-1">
        {title}
      </h2>
      <Card className="p-6 bg-white border border-black/[0.08] shadow-subtle rounded-2xl">{children}</Card>
    </div>
  );
}

function Row({ title, description, trailing, className = "" }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {description && <p className="text-xs text-text-secondary mt-0.5 leading-relaxed font-sans">{description}</p>}
      </div>
      <div className="shrink-0">{trailing}</div>
    </div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
        <PageHeader
          eyebrow="CONFIGURATION"
          title="Settings & System"
          description="Your user credentials, aesthetic configuration, and connected financial intelligence services."
          icon={SlidersHorizontal}
          className="mb-8"
        />

        <Section title="Account & Profile">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <Avatar initials={user?.initials || "?"} size={50} />
              <div className="min-w-0">
                <p className="text-base font-display font-bold text-[#181A2A] truncate">
                  {user?.name || "Authenticated User"}
                </p>
                <p className="text-xs text-[#52586B] mt-0.5 truncate font-mono">{user?.email}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" icon={LogOut} onClick={signOut} className="self-start sm:self-auto font-mono text-xs">
              Sign out
            </Button>
          </div>
        </Section>

        <Section title="Design & Appearance">
          <div className="space-y-4">
            <Row
              title="Design System"
              description="Crisp white canvas, geometric sans typography, and vibrant emerald green accents."
              trailing={<Badge tone="accent">Emerald Green</Badge>}
            />
            <Row
              className="border-t border-black/[0.06] pt-4"
              title="Interface Language"
              description="Analysis, prompt parsing, and citations currently formatted in English."
              trailing={<span className="text-xs font-mono font-medium text-text-primary">English (US/UK/IN)</span>}
            />
          </div>
        </Section>

        <Section title="Backend Connectors & AI">
          <div className="space-y-4">
            <Row
              title="Google Gemini AI Engine"
              description="Powers multi-agent synthesis, document parsing, and vision statement extraction."
              trailing={<span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Server Connected</span>}
            />
            <Row
              className="border-t border-black/[0.06] pt-4"
              title="Tavily Web Search"
              description="Real-time web search for live regulatory bulletins and security alerts."
              trailing={<span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Server Connected</span>}
            />
            <Row
              className="border-t border-black/[0.06] pt-4"
              title="Deterministic Python Risk Core"
              description="Independent local mathematical engine for covariance and drawdown replays."
              trailing={<span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Active</span>}
            />
          </div>
        </Section>

        <Section title="Legal & Architecture">
          <Row title="Build Version" trailing={<span className="text-xs font-mono text-text-muted">v2.4.0 (Editorial Release)</span>} />
          <Disclaimer className="pt-4 border-t border-black/[0.06] mt-4" />
        </Section>
      </div>
    </AppLayout>
  );
}
