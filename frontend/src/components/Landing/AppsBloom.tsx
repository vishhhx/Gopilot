import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Blossom } from "@/components/bloom/Blossom";
import { Flower } from "@/components/bloom/Flowers";
import { SERVICE_ORDER, SERVICES, type ServiceId } from "@/lib/services";
import { Reveal } from "./Reveal";

/** The agents behind each app, named for what they do. */
const AGENTS: Record<ServiceId, string[]> = {
  gmail: ["Reader", "Writer", "Trash", "Delete"],
  calendar: ["Reader", "Writer", "Delete"],
  drive: ["Reader", "Uploader", "Sharer", "Delete"],
  sheets: ["Reader", "Writer", "Formatting", "Structure", "Tabs"],
  meet: ["Creator", "Reader", "Editor", "Cancel"],
  forms: ["Creator", "Editor", "Responses", "Delete"],
};

export function AppsBloom() {
  const [focus, setFocus] = useState<ServiceId | null>(null);
  const svc = focus ? SERVICES[focus] : null;

  return (
    <section id="apps" className="scroll-mt-16 overflow-x-clip bg-paper py-28 sm:py-36">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Reveal>
              <h2 className="font-serif text-[clamp(38px,4.6vw,64px)] leading-[1.02] font-normal tracking-[-0.03em]">
                Six apps. One blossom.
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="mt-6 max-w-[40ch] text-[18px] leading-relaxed text-ink">
                Each Google app has its own team of agents, and each keeps its flower everywhere in GoPilot: on
                chat cards, on workflow nodes, and here. The orchestrator sits at the centre.
              </p>
            </Reveal>
            <div className="relative mx-auto mt-10 aspect-square w-full max-w-[420px]">
              <motion.div
                className="absolute inset-0"
                initial={{ rotate: -40, scale: 0.6, opacity: 0 }}
                whileInView={{ rotate: 0, scale: 1, opacity: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <Blossom
                  size="100%"
                  active={focus ? [focus] : undefined}
                  titles
                  className="animate-[spin_90s_linear_infinite] motion-reduce:animate-none"
                />
              </motion.div>
            </div>
            <p key={focus ?? "all"} className="mt-4 text-center text-[15px] text-ink-soft animate-rise-sm" aria-live="polite">
              {svc ? (
                <>
                  <span className={cn("font-medium", svc.textDeep)}>{svc.name}</span> is the {svc.flower} petal.
                </>
              ) : (
                "Point at an app to find its petal."
              )}
            </p>
          </div>

          <ul className="divide-y divide-line" onMouseLeave={() => setFocus(null)}>
            {SERVICE_ORDER.map((id, i) => {
              const s = SERVICES[id];
              const on = focus === id;
              return (
                <li key={id}>
                  <Reveal delay={i * 0.05} y={18}>
                    <button
                      type="button"
                      onMouseEnter={() => setFocus(id)}
                      onFocus={() => setFocus(id)}
                      onClick={() => setFocus(on ? null : id)}
                      aria-pressed={on}
                      className="group flex w-full gap-5 py-7 text-left sm:gap-7"
                    >
                      <span
                        className={cn(
                          "flex size-16 shrink-0 items-center justify-center rounded-full transition-[transform,background-color] duration-500 ease-[var(--ease-bloom)] sm:size-20",
                          on ? cn(s.bgWash, "scale-110 rotate-12") : "bg-paper-2"
                        )}
                      >
                        <Flower service={id} size={44} bloom delay={i * 90} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-serif text-[28px] leading-tight tracking-[-0.015em] sm:text-[32px]">{s.name}</span>
                          <span className={cn("text-[14px] capitalize transition-colors", on ? s.textDeep : "text-ink-faint")}>
                            {s.flower}
                          </span>
                        </span>
                        <span className="mt-1.5 block text-[16.5px] leading-relaxed text-ink">{s.does}</span>
                        <span className="mt-3 flex flex-wrap gap-1.5" aria-label={`${s.name} agents`}>
                          {AGENTS[id].map((a, j) => (
                            <span
                              key={a}
                              className={cn(
                                "inline-flex h-7 items-center rounded-full px-3 text-[13px] transition-colors duration-300",
                                on ? cn(s.bgWash, s.textDeep) : "bg-paper-2 text-ink-soft"
                              )}
                              style={{ transitionDelay: on ? `${j * 40}ms` : "0ms" }}
                            >
                              {a}
                            </span>
                          ))}
                        </span>
                      </span>
                    </button>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
