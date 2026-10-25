import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu, SquarePen } from "lucide-react";
import SideNavbar, { MobileSidebar } from "@/components/nav/SideNavbar";
import Logo from "@/components/nav/Logo";

function SecureLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-paper">
      <SideNavbar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-accent"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <Link to="/new" aria-label="GoPilot home">
            <Logo variant="compact" />
          </Link>
          <Link
            to="/new"
            className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-accent"
            aria-label="New task"
          >
            <SquarePen className="size-5" />
          </Link>
        </header>
        <main className="min-h-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default SecureLayout;
