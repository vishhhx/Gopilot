import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { Blossom } from "@/components/bloom/Blossom";
import { Markdown } from "./Markdown";
import { SERVICES, type ServiceId } from "@/lib/services";
import type { AgentStep } from "@/lib/stream";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/bloom/AppLogo";

const TOOL_LABELS: Record<string, [running: string, done: string]> = {
  list_my_workflows: ["Finding your workflows", "Found your workflows"],
  run_workflow: ["Starting the workflow", "Workflow started"],
};

const stepLabel = (s: AgentStep) => {
  const own = TOOL_LABELS[s.tool];
  if (own) return s.status === "done" ? own[1] : own[0];
  const name = s.service ? SERVICES[s.service].name : s.tool.replace(/_agent$/, "").replace(/_/g, " ");
  return s.status === "done" ? `${name} done` : `Working in ${name}`;
};

/**
 * The reply while it streams: the service agents the orchestrator is calling, ticked off as they
 * finish, then the answer text as it arrives.
 */
export function LiveReply({ steps, text }: { steps: AgentStep[]; text: string }) {
  const active = [...new Set(steps.map((s) => s.service).filter((s): s is ServiceId => Boolean(s)))];
  const working = steps.some((s) => s.status === "running");

  return (
    <div className="flex gap-3 sm:gap-4" role="status" aria-live="polite">
      <div className="pt-1">
        <Blossom size={26} motion="loading" active={active.length ? active : undefined} />
      </div>
      <div className="min-w-0 flex-1">
        {steps.length > 0 && (
          <ul className="mb-2 space-y-1" aria-label="Agent steps">
            <AnimatePresence initial={false}>
              {steps.map((s) => (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "flex items-center gap-2 overflow-hidden text-[14px]",
                    s.status === "done" ? "text-ink-faint" : "text-ink-soft"
                  )}
                >
                  {s.status === "done" ? (
                    <Check className="size-3.5 shrink-0 text-sage-deep" strokeWidth={2.4} />
                  ) : s.service ? (
                    <AppLogo service={s.service} size={15} />
                  ) : (
                    <span className="size-3.5 shrink-0 rounded-full bg-line-strong" />
                  )}
                  <span className={cn("truncate", s.status === "running" && "shimmer-text")}>{stepLabel(s)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
        {text.trim() ? (
          <Markdown text={text} />
        ) : (
          !working && (
            <p className="shimmer-text font-serif text-[16.5px]">
              {steps.length ? "Putting the answer together…" : "Reading your request…"}
            </p>
          )
        )}
      </div>
    </div>
  );
}
