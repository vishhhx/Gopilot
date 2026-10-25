import { useRef } from "react";
import { Link } from "react-router-dom";
import { useInView } from "motion/react";
import { Button } from "@/components/ui/button";
import { Garden } from "@/components/bloom/Flowers";
import { type Plant } from "@/lib/garden";
import { useAppSelector } from "@/store/hooks";

const HEDGE: Plant[] = [
  { kind: "lavender", x: 0.05, h: 150, lean: -10, s: 0.85, d: 0, leaves: [0.3] },
  { kind: "peony", x: 0.14, h: 210, lean: 6, s: 1, d: 150, leaves: [-0.35, 0.5] },
  { kind: "sage", x: 0.23, h: 120, lean: -4, s: 0.85, d: 300, leaves: [] },
  { kind: "buttercup", x: 0.33, h: 170, lean: 10, s: 0.9, d: 90, leaves: [0.4] },
  { kind: "mint", x: 0.44, h: 135, lean: -6, s: 0.85, d: 380, leaves: [-0.3] },
  { kind: "blossom", x: 0.55, h: 230, lean: 4, s: 1.05, d: 200, leaves: [-0.3, 0.55] },
  { kind: "cornflower", x: 0.66, h: 180, lean: -8, s: 0.9, d: 60, leaves: [0.35] },
  { kind: "lavender", x: 0.76, h: 140, lean: 8, s: 0.8, d: 340, leaves: [] },
  { kind: "peony", x: 0.86, h: 195, lean: -10, s: 0.95, d: 240, leaves: [0.3, -0.5] },
  { kind: "buttercup", x: 0.95, h: 130, lean: 6, s: 0.8, d: 420, leaves: [] },
];

export function Footer() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  return (
    <footer className="relative overflow-hidden bg-paper-2 pt-28 sm:pt-36">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
          <h2 className="max-w-[16ch] font-serif text-[clamp(34px,4vw,54px)] leading-[1.05] font-normal tracking-[-0.03em]">
            Hand the busywork to the agents.
          </h2>
          <Button asChild size="lg" className="h-12 px-7 text-[16px]">
            <Link to={isAuthenticated ? "/new" : "/login"}>{isAuthenticated ? "Open GoPilot" : "Get started free"}</Link>
          </Button>
        </div>

        <GrowOnView />
      </div>

      <div className="bg-paper-3">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <p
            aria-hidden
            className="pt-6 pb-4 font-serif text-[clamp(80px,26.5vw,420px)] leading-[0.85] font-normal tracking-[-0.055em] text-ink select-none"
          >
            GoPilot
          </p>
        </div>
        <div className="border-t border-line/70">
          <nav
            className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 py-6 text-[14px] text-ink-soft sm:px-8"
            aria-label="Footer"
          >
            <span>© {new Date().getFullYear()} GoPilot</span>
            <span className="flex flex-wrap gap-5">
              <a href="#how" className="hover:text-ink">How it works</a>
              <a href="#workflows" className="hover:text-ink">Workflows</a>
              <a href="#pricing" className="hover:text-ink">Pricing</a>
              <Link to="/login" className="hover:text-ink">Sign in</Link>
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
}

/** The hedge only starts growing once it scrolls into view. */
function GrowOnView() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-40px" });
  return (
    <div ref={ref} className="-mx-5 mt-16 aspect-[1000/260] sm:-mx-8">
      {seen && <Garden plants={HEDGE} height={260} className="h-full w-full" />}
    </div>
  );
}
