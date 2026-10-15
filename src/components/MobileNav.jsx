import { NavLink } from "react-router-dom";
import { LayoutGrid, MessageCircle, Activity, ShieldAlert, Settings as SettingsIcon } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Home", icon: LayoutGrid },
  { to: "/ask", label: "Ask", icon: MessageCircle },
  { to: "/risk-simulator", label: "Risk", icon: Activity },
  { to: "/scam-screener", label: "Scam", icon: ShieldAlert },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] border-t border-[#EDE7EB] bg-white/95 backdrop-blur-xl shadow-subtle">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center gap-1 py-2.5 flex-1 text-[0.68rem] font-medium transition-colors duration-150 ${
              isActive ? "text-brand-berry font-semibold" : "text-text-muted hover:text-text-primary"
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute top-0 h-[2.5px] w-8 rounded-full bg-brand-berry" />
              )}
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? "text-brand-berry" : "text-text-muted"} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
