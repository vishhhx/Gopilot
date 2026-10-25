import { useEffect, useState } from "react";
import { Check, ChevronDown, CircleSlash, GitFork, Pause, Play, UserRoundCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, formatTime } from "@/lib/format";
import { humanizeAgentName, resolveService, SERVICES } from "@/lib/services";
import type { RunStep, WorkflowRun } from "@/lib/workflow";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Blossom } from "@/components/bloom/Blossom";
import { Markdown } from "@/components/chat/Markdown";
import { AppLogo } from "@/components/bloom/AppLogo";

const headline = (run: WorkflowRun) => {
  const step = run.steps[run.currentStep];
  const agents = run.steps.filter((s) => s.kind === "Agent").length;
  switch (run.status) {
    case "running":
      return { title: "Running", detail: step ? `Step ${run.currentStep + 1} of ${run.steps.length}: ${stepName(step)}` : "Starting" };
    case "waiting_for_review":
      return {
        title: step?.kind === "Agent" ? "An agent has a question" : "Your review is needed",
        detail: step ? `Paused at step ${run.currentStep + 1}: ${stepName(step)}` : "",
      };
    case "completed":
      return { title: "Run finished", detail: `All ${run.steps.length} steps done${agents ? `, ${agents} by agents` : ""}.` };
    case "rejected":
      return { title: "Run stopped", detail: run.error ?? "You rejected it." };
    default:
      return { title: "Run failed", detail: run.error ?? "A step failed." };
  }
};

const stepName = (s: RunStep) => (s.agentName ? humanizeAgentName(s.agentName) : s.label);

function StepIcon({ step }: { step: RunStep }) {
  const svc = resolveService(step.service);
  const base = "flex size-10 items-center justify-center rounded-full";
  if (step.status === "running")
    return (
      <span className={cn(base, svc ? SERVICES[svc].bgWash : "bg-paper-2")}>
        <Blossom size={22} motion="loading" />
      </span>
    );
  if (step.status === "failed")
    return (
      <span className={cn(base, "bg-danger-wash text-danger")}>
        <X className="size-4" strokeWidth={3} />
      </span>
    );
  if (step.status === "waiting")
    return (
      <span className={cn(base, "bg-lavender-wash text-lavender-deep")}>
        <Pause className="size-4" />
      </span>
    );
  if (step.status === "skipped" || step.status === "pending")
    return (
      <span className={cn(base, "bg-paper-2 text-ink-faint")}>
        {step.status === "skipped" ? <CircleSlash className="size-4" /> : <span className="size-2 rounded-full bg-line-strong" />}
      </span>
    );
  return (
    <span className={cn(base, svc ? SERVICES[svc].bgWash : step.kind === "Checker" ? "bg-buttercup-wash" : "bg-lavender-wash")}>
      {svc ? (
        <AppLogo service={svc} size={24} bloom />
      ) : step.kind === "Checker" ? (
        <GitFork className="size-4 rotate-180 text-buttercup-deep" />
      ) : (
        <UserRoundCheck className="size-4 text-lavender-deep" />
      )}
    </span>
  );
}

function StepRow({ step, index, last, open, onToggle }: { step: RunStep; index: number; last: boolean; open: boolean; onToggle: () => void }) {
  const svc = resolveService(step.service);
  const hasBody = Boolean(step.summary || step.error || step.note || step.question);
  return (
    <li className="relative pl-14">
      {!last && (
        <span
          aria-hidden
          className={cn("absolute top-11 bottom-0 left-[19px] w-[3px] rounded-full", step.status === "done" ? "bg-leaf" : "bg-line")}
        />
      )}
      <span className="absolute top-0 left-0">
        <StepIcon step={step} />
      </span>
      <button
        type="button"
        onClick={onToggle}
        disabled={!hasBody}
        aria-expanded={open}
        className="flex w-full items-start gap-3 py-1 text-left disabled:cursor-default"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] text-ink-soft">
            Step {index + 1}
            {svc ? `, ${SERVICES[svc].name}` : ""}
            {step.finishedAt && step.status === "done" ? `, ${formatTime(step.finishedAt)}` : ""}
          </span>
          <span className={cn("block truncate text-[15px] font-medium", step.status === "skipped" ? "text-ink-faint" : "text-ink")}>
            {stepName(step)}
          </span>
          {step.status === "failed" && step.error && !open && <span className="block truncate text-[13px] text-danger">{step.error}</span>}
        </span>
        {hasBody && <ChevronDown className={cn("mt-2 size-4 shrink-0 text-ink-soft transition-transform duration-300", open && "rotate-180")} />}
      </button>
      <div className={cn("space-y-2.5 pt-1", open ? "pb-6 animate-rise-sm" : "pb-4")}>
        {open && (
          <>
            {step.summary && <Markdown text={step.summary} className="text-[14.5px]" />}
            {step.error && <p className="rounded-2xl bg-danger-wash px-3.5 py-2.5 text-[13.5px] text-ink">{step.error}</p>}
            {step.question && step.status !== "waiting" && (
              <p className="text-[13.5px] text-ink-soft">
                Asked: {step.question}
                {step.note && <> You answered: {step.note}</>}
              </p>
            )}
            {step.kind === "HIL" && step.note && <p className="text-[13.5px] text-ink-soft">Your note: {step.note}</p>}
          </>
        )}
      </div>
    </li>
  );
}

/** A run of the workflow: its steps as they happen, and the review controls when it pauses. */
export function RunPanel({
  open,
  onOpenChange,
  run,
  onReview,
  onRunAgain,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: WorkflowRun | null;
  onReview: (approved: boolean, note: string) => Promise<void>;
  onRunAgain: () => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [deciding, setDeciding] = useState<"approve" | "reject" | null>(null);

  const waitingStep = run?.status === "waiting_for_review" ? run.steps[run.currentStep] : null;
  const asking = waitingStep?.kind === "Agent";

  // open the step that just finished or needs attention
  const focusKey = run ? `${run.id}:${run.currentStep}:${run.status}` : "";
  useEffect(() => {
    if (!run) return;
    const target =
      run.status === "completed"
        ? run.steps[run.steps.length - 1]
        : run.steps[Math.min(run.currentStep, run.steps.length - 1)] ?? null;
    const previous = run.steps[run.currentStep - 1];
    setExpanded((e) => ({
      ...e,
      ...(target && { [target.nodeId]: true }),
      ...(run.status === "waiting_for_review" && previous && { [previous.nodeId]: true }),
    }));
    setNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  const decide = async (approved: boolean) => {
    setDeciding(approved ? "approve" : "reject");
    try {
      await onReview(approved, note);
    } finally {
      setDeciding(null);
    }
  };

  const head = run ? headline(run) : null;
  const finished = run && !["running", "waiting_for_review"].includes(run.status);
  const inputs = run ? Object.entries(run.inputs) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-line px-6 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                run?.status === "failed" || run?.status === "rejected"
                  ? "bg-danger-wash"
                  : run?.status === "waiting_for_review"
                    ? "bg-lavender-wash"
                    : "bg-sage-wash"
              )}
            >
              <Blossom size={26} motion={run?.status === "running" ? "loading" : run?.status === "completed" ? "bloom" : "sway"} />
            </span>
            <div className="min-w-0">
              <SheetTitle className="font-serif text-[22px] font-medium tracking-[-0.01em]">{head?.title ?? "Run"}</SheetTitle>
              <SheetDescription className="text-[14px] text-ink-soft">{head?.detail}</SheetDescription>
            </div>
          </div>
          {run && (
            <p className="mt-2 text-[12.5px] text-ink-faint">
              {run.workflowTitle ? `${run.workflowTitle}, ` : ""}started {formatDateTime(run.createdAt)}
            </p>
          )}
          {inputs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {inputs.map(([key, value]) => (
                <span key={key} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-paper-2 px-2.5 py-1 text-[12px]">
                  <span className="shrink-0 text-ink-soft">{key.replace(/_/g, " ")}</span>
                  <span className="truncate text-ink">{value}</span>
                </span>
              ))}
            </div>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {run ? (
            <ol>
              {run.steps.map((s, i) => (
                <StepRow
                  key={s.nodeId}
                  step={s}
                  index={i}
                  last={i === run.steps.length - 1}
                  open={Boolean(expanded[s.nodeId])}
                  onToggle={() => setExpanded((e) => ({ ...e, [s.nodeId]: !e[s.nodeId] }))}
                />
              ))}
            </ol>
          ) : (
            <p className="pt-10 text-center text-[15px] text-ink-soft">No run yet.</p>
          )}
        </div>

        {waitingStep && (
          <div className="space-y-3 border-t border-line bg-paper-2/60 px-6 py-4">
            <p className="text-[14px] text-ink">
              {asking ? waitingStep.question : waitingStep.message || "Check the results above, then approve to carry on or reject to stop."}
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={asking ? "Your answer" : "Optional note for the next steps, e.g. 'make the subject shorter'"}
              rows={2}
              className="bg-raised"
            />
            <div className="flex gap-2">
              <Button variant="outline" size="lg" className="flex-1" disabled={deciding !== null} onClick={() => decide(false)}>
                {deciding === "reject" ? <Blossom size={16} motion="loading" /> : <X className="size-4" />}
                {asking ? "Stop the run" : "Reject"}
              </Button>
              <Button size="lg" className="flex-1" disabled={deciding !== null || (asking && !note.trim())} onClick={() => decide(true)}>
                {deciding === "approve" ? <Blossom size={16} motion="loading" /> : <Check className="size-4" />}
                {asking ? "Answer and continue" : "Approve and continue"}
              </Button>
            </div>
          </div>
        )}

        {finished && (
          <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-3.5">
            <span className="text-[13.5px] text-ink-soft">
              {run.status === "completed" ? "Finished" : run.status === "rejected" ? "Stopped by you" : "Stopped at the failed step"}
            </span>
            <Button variant="outline" size="sm" onClick={onRunAgain}>
              <Play className="size-3.5 fill-current" />
              Run again
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
