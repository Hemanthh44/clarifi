import Sidebar from "../components/Sidebar";
import MobileNav from "../components/MobileNav";

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen w-full bg-white text-text-primary selection:bg-brand-roseLight selection:text-brand-berry">
      <Sidebar />
      <div className="relative flex-1 min-w-0 pb-24 md:pb-0 bg-white">
        {/* Subtle atmospheric ambient glow behind content */}
        <div
          className="editorial-ambient-glow -top-24 right-[-4rem] h-96 w-96 bg-brand-roseLight"
          aria-hidden="true"
        />
        <div
          className="editorial-ambient-glow top-[40%] right-[-6rem] h-80 w-80 bg-brand-roseLight/60"
          aria-hidden="true"
        />
        <div className="relative">{children}</div>
      </div>
      <MobileNav />
    </div>
  );
}
