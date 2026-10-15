import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  MessageCircle,
  FileSearch,
  Activity,
  ShieldAlert,
  Brain,
  PieChart,
  Gauge,
  History as HistoryIcon,
  Library,
  Settings as SettingsIcon,
} from "lucide-react";
import Logo from "./Logo";
import { Avatar } from "./Basics";
import { useAuth } from "../lib/auth";

const groups = [
  {
    label: null,
    items: [{ to: "/dashboard", label: "Overview", icon: LayoutGrid }],
  },
  {
    label: "AI Co-Pilot",
    items: [
      { to: "/ask", label: "Ask ClariFi", icon: MessageCircle },
      { to: "/product-explainer", label: "Product Explainer", icon: FileSearch },
      { to: "/risk-simulator", label: "Risk Simulator", icon: Activity },
      { to: "/ml-lab", label: "ML & Quant Lab", icon: Brain },
      { to: "/scam-screener", label: "Scam Screener", icon: ShieldAlert },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { to: "/portfolio", label: "Portfolio Overview", icon: PieChart },
      { to: "/risk-simulator", label: "Risk Profile", icon: Gauge },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { to: "/documents", label: "Documents", icon: Library },
      { to: "/history", label: "History", icon: HistoryIcon },
    ],
  },
];

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 py-6 px-4 overflow-y-auto no-scrollbar border-r border-[#EDE7EB] bg-white">
      <div className="px-2 mb-8">
        <NavLink to="/dashboard" className="inline-block hover:opacity-90 transition-opacity">
          <Logo size={24} />
        </NavLink>
      </div>

      <nav className="flex flex-col gap-6 flex-1">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 mb-2 text-[0.68rem] font-sans font-semibold tracking-wider text-text-muted uppercase">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-1">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={label}
                  to={to}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                      isActive
                        ? "bg-brand-berry text-white font-medium shadow-sm"
                        : "text-text-secondary hover:text-text-primary hover:bg-[#FAF7F9]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={17}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        className={isActive ? "text-white" : "text-text-muted group-hover:text-brand-berry"}
                      />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <NavLink
        to="/settings"
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl mt-4 pt-4 border-t border-[#EDE7EB] hover:bg-[#FAF7F9] transition-colors duration-150"
      >
        <Avatar initials={user?.initials || "?"} size={32} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{user?.name || "Your account"}</p>
          <p className="text-xs text-text-muted truncate">{user?.email || "Signed in"}</p>
        </div>
        <SettingsIcon size={15} className="ml-auto text-text-muted shrink-0" />
      </NavLink>
    </aside>
  );
}
