import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { Blossom } from "@/components/bloom/Blossom";
import type { ServiceId } from "@/lib/services";

const STEPS = [
  "Reading your request",
  "Choosing the right agents",
  "Working in your apps",
  "Putting the answer together",
];

/**
 * Shown while the orchestrator works. The blossom's petals open in turn, finished steps are
 * ticked off, and the current one carries a moving sheen. The last step holds until the reply lands.
 */
export function Thinking({
  steps = STEPS,
  services,
  every = 3000,
  showTimer = true,
}: {
  steps?: string[];
  /** petals to light; the rest stay small */
  services?: ServiceId[];
  /** ms per step */
  every?: number;
  showTimer?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const t = setInterval(() => {
      const ms = Date.now() - started;
      setSeconds(Math.floor(ms / 1000));
      setStep(Math.min(steps.length - 1, Math.floor(ms / every)));
    }, Math.min(250, every / 2));
    return () => clearInterval(t);
  }, [steps.length, every]);

  return (
    <div className="flex gap-3 sm:gap-4 animate-rise-sm" role="status" aria-live="polite">
      <div className="pt-0.5">
        <Blossom size={28} motion="loading" active={services} />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <ul className="space-y-1" aria-label="Finished steps">
          <AnimatePresence initial={false}>
            {steps.slice(0, step).map((s) => (
              <motion.li
                key={s}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-2 overflow-hidden text-[14px] text-ink-faint"
              >
                <Check className="size-3.5 shrink-0 text-sage-deep" strokeWidth={2.4} />
                <span className="truncate">{s}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <div className="relative h-7 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center gap-2"
            >
              <span className="shimmer-text truncate font-serif text-[16.5px]">{steps[step]}…</span>
              {showTimer && seconds >= 5 && (
                <span className="shrink-0 text-[13px] tabular-nums text-ink-faint">{seconds}s</span>
              )}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
