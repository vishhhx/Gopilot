import { useRef, type CSSProperties, type ReactNode } from "react";
import { motion, useInView } from "motion/react";
import { GitFork, Play, UserRoundCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Flower, FlowerHead } from "@/components/bloom/Flowers";
import { SERVICES } from "@/lib/services";
import { Reveal } from "./Reveal";

interface DemoNode {
  title: string;
  note: string;
  x: number;
  y: number;
  mark: ReactNode;
  wash: string;
}

const NODES: DemoNode[] = [
  { title: "Start", note: "When you press Run", x: 135, y: 215, wash: "bg-mint-wash", mark: <Play className="size-4 fill-current text-mint-deep" /> },
  { title: "Gmail reader", note: "Read new invoices", x: 325, y: 110, wash: SERVICES.gmail.bgWash, mark: <Flower service="gmail" size={26} /> },
  { title: "Checker", note: "Over ₹10,000?", x: 515, y: 260, wash: "bg-buttercup-wash", mark: <GitFork className="size-4 rotate-90 text-buttercup-deep" /> },
  { title: "Human review", note: "Wait for your OK", x: 705, y: 110, wash: "bg-lavender-wash", mark: <UserRoundCheck className="size-4 text-lavender-deep" /> },
  { title: "Sheets writer", note: "Log to Expenses", x: 880, y: 220, wash: SERVICES.sheets.bgWash, mark: <Flower service="sheets" size={26} /> },
];

/** Catmull-Rom through the node centres, as one smooth cubic path. */
function vinePath(pts: { x: number; y: number }[]) {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const VINE = vinePath(NODES);
const DRAW_S = 2.2;

/** Leaves and buds that sprout along the vine once it has grown past them. */
const SPROUTS = [
  { x: 225, y: 158, r: -40, at: 0.2 },
  { x: 245, y: 150, r: 150, at: 0.22 },
  { x: 420, y: 190, r: 30, at: 0.4 },
  { x: 610, y: 190, r: -150, at: 0.6 },
  { x: 622, y: 172, r: -30, at: 0.62 },
  { x: 795, y: 160, r: 25, at: 0.82 },
];
const BUDS = [
  { x: 420, y: 172, at: 0.42, kind: "peony" as const },
  { x: 615, y: 208, at: 0.64, kind: "buttercup" as const },
  { x: 800, y: 145, at: 0.86, kind: "lavender" as const },
];

function NodeChip({ n, i, on }: { n: DemoNode; i: number; on: boolean }) {
  const at = n.x / 1000;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={on ? { opacity: 1, scale: 1 } : {}}
      transition={{ delay: at * DRAW_S, duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
      className="flex w-max items-center gap-3 rounded-2xl border border-line bg-raised py-2.5 pr-4 pl-2.5 shadow-float"
      style={{ zIndex: 10 - i }}
    >
      <span className={cn("flex size-10 items-center justify-center rounded-xl", n.wash)}>{n.mark}</span>
      <span>
        <span className="block text-[14.5px] leading-tight font-semibold text-ink">{n.title}</span>
        <span className="block text-[13px] leading-tight text-ink-soft">{n.note}</span>
      </span>
    </motion.div>
  );
}

const FACTS = [
  {
    flower: "lavender" as const,
    title: "Describe it in a sentence",
    text: "Type what the workflow should do and GoPilot lays out and connects the nodes. Drag anything to change it.",
  },
  {
    flower: "peony" as const,
    title: "Stop for your approval",
    text: "Add a human review step and the run pauses there, shows what the agents produced, and waits for your yes or no.",
  },
  {
    flower: "cornflower" as const,
    title: "Share it on Agent Hub",
    text: "Publish a workflow with a few example prompts, or copy one someone else built into your own workspace.",
  },
];

export function WorkflowVine() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { once: true, margin: "-140px" });

  return (
    <section id="workflows" className="scroll-mt-16 bg-paper py-28 sm:py-36">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-serif text-[clamp(38px,4.6vw,64px)] leading-[1.02] font-normal tracking-[-0.03em]">
              Build it once. Let it run.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="max-w-[44ch] text-[18px] leading-relaxed text-ink lg:justify-self-end">
              Drag agents onto a canvas, connect them, and add a checker or a review step wherever you want a say.
              Every run shows you what each agent did along the way.
            </p>
          </Reveal>
        </div>

        <div
          ref={ref}
          className={cn(
            "relative mt-14 overflow-hidden rounded-[32px] bg-paper-2 bg-[radial-gradient(var(--line-strong)_1px,transparent_1.2px)] [background-size:22px_22px]",
            on && "vine-on"
          )}
        >
          {/* wide screens: the vine winds left to right */}
          <div className="relative hidden aspect-[1000/380] md:block">
            <svg viewBox="0 0 1000 380" className="absolute inset-0 h-full w-full" aria-hidden>
              <path d={VINE} pathLength={1} className="vine-path" fill="none" stroke="var(--stem)" strokeWidth={5} strokeLinecap="round" />
              {SPROUTS.map((s, i) => (
                <g key={i} transform={`translate(${s.x} ${s.y}) rotate(${s.r})`}>
                  <path
                    d="M0 0 C 8 -9 22 -10 34 -3 C 22 5 9 6 0 0 Z"
                    fill={i % 2 ? "var(--leaf-deep)" : "var(--leaf)"}
                    className="origin-left [transform-box:fill-box]"
                    style={
                      {
                        opacity: on ? 1 : 0,
                        transform: on ? "none" : "scale(0)",
                        transition: `transform 700ms var(--ease-bloom) ${s.at * DRAW_S}s, opacity 300ms ${s.at * DRAW_S}s`,
                      } as CSSProperties
                    }
                  />
                </g>
              ))}
              {BUDS.map((b, i) => (
                <g key={i} transform={`translate(${b.x} ${b.y}) scale(0.32)`}>
                  <g
                    className="origin-center [transform-box:fill-box]"
                    style={{
                      opacity: on ? 1 : 0,
                      transform: on ? "none" : "scale(0) rotate(-60deg)",
                      transition: `transform 800ms var(--ease-bloom) ${b.at * DRAW_S + 0.2}s, opacity 300ms ${b.at * DRAW_S + 0.2}s`,
                    }}
                  >
                    <FlowerHead kind={b.kind} />
                  </g>
                </g>
              ))}
            </svg>
            {NODES.map((n, i) => (
              <div
                key={n.title}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${n.x / 10}%`, top: `${(n.y / 380) * 100}%` }}
              >
                <NodeChip n={n} i={i} on={on} />
              </div>
            ))}
          </div>

          {/* phones: the vine climbs down the left edge */}
          <div className="relative px-5 py-8 md:hidden">
            <span
              aria-hidden
              className="absolute top-10 bottom-10 left-[49px] w-1 origin-top rounded-full bg-stem transition-transform duration-[2200ms] ease-[var(--ease-soft)]"
              style={{ transform: on ? "scaleY(1)" : "scaleY(0)" }}
            />
            <ol className="relative space-y-5">
              {NODES.map((n, i) => (
                <li key={n.title}>
                  <NodeChip n={{ ...n, x: (i / NODES.length) * 1000 }} i={i} on={on} />
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {FACTS.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <Flower kind={f.flower} size={30} bloom delay={i * 120} />
              <h3 className="mt-4 font-serif text-[23px] leading-tight tracking-[-0.01em]">{f.title}</h3>
              <p className="mt-2 text-[16.5px] leading-relaxed text-ink">{f.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
