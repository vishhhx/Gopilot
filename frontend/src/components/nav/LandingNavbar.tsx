import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import Logo from "./Logo";

const LINKS = [
  { name: "How it works", href: "#how" },
  { name: "Apps", href: "#apps" },
  { name: "Workflows", href: "#workflows" },
  { name: "Pricing", href: "#pricing" },
];

/** Wordmark, four links and one action. Gains a ground once the page scrolls. */
function LandingNavbar() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cta = isAuthenticated ? { to: "/new", label: "Open GoPilot" } : { to: "/login", label: "Get started" };

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300",
        scrolled || open ? "bg-paper/95 shadow-[0_1px_0_var(--line)]" : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-6 px-5 sm:px-8" aria-label="Main">
        <a href="#top" className="rounded-lg" aria-label="GoPilot, back to top">
          <Logo motion="bloom" />
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-full px-3.5 py-2 text-[15px] text-ink transition-colors hover:bg-paper-2"
              >
                {l.name}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 md:flex">
          {!isAuthenticated && (
            <Link to="/login" className="rounded-full px-3.5 py-2 text-[15px] text-ink transition-colors hover:bg-paper-2">
              Sign in
            </Link>
          )}
          <Button asChild>
            <Link to={cta.to}>{cta.label}</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-paper-2 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="border-t border-line bg-paper px-5 pt-2 pb-5 md:hidden"
          >
            <ul className="space-y-1">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-[17px] hover:bg-paper-2">
                    {l.name}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              {!isAuthenticated && (
                <Button asChild variant="outline" className="flex-1" size="lg">
                  <Link to="/login">Sign in</Link>
                </Button>
              )}
              <Button asChild className="flex-1" size="lg">
                <Link to={cta.to}>{cta.label}</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

export default LandingNavbar;
