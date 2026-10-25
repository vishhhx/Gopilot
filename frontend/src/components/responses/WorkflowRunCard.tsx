import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, CircleSlash, GitFork, Pause, UserRoundCheck, Workflow, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import type { DynamicContent } from "@/lib/chat";
import { humanizeAgentName, resolveService } from "@/lib/services";
import { isActive, issuesMessage, workflowApi, type RunStep, type WorkflowRun } from "@/lib/workflow";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Blossom } from "@/components/bloom/Blossom";
import { AppLogo } from "@/components/bloom/AppLogo";
import { Markdown } from "@/components/chat/Markdown";

const STATUS: Record<WorkflowRun["status"], { label: string; className: string }> = {
  running: { label: "Running", className: "bg-cornflower-wash text-cornflower-deep" },
  waiting_for_review: { label: "Waiting for you", className: "bg-lavender-wash text-lavender-deep" },
  completed: { label: "Finished", className: "bg-sage-wash text-sage-deep" },
  failed: { label: "Failed", className: "bg-danger-wash text-danger" },
  rejected: { label: "Stopped", className: "bg-paper-2 text-ink-soft" },
};

const stepName = (s: RunStep) => (s.agentName ? humanizeAgentName(s.agentName) : s.label);

function StepMark({ step }: { step: RunStep }) {
  const svc = resolveService(step.service);
  if (step.status === "running") return <Blossom size={18} motion="loading" />;
  if (step.status === "failed") return <X className="size-4 text-danger" strokeWidth={3} />;
  if (step.status === "waiting") return <Pause className="size-4 text-lavender-deep" />;
  if (step.status === "skipped") return <CircleSlash className="size-3.5 text-ink-faint" />;
  if (svc) return <AppLogo service={svc} size={16} badge={false} className={cn(step.status === "pending" && "opacity-40 grayscale")} />;
  if (step.kind === "Checker") return <GitFork className={cn("size-3.5 rotate-180 text-buttercup-deep", step.status === "pending" && "opacity-40")} />;
  return <UserRoundCheck className={cn("size-3.5 text-lavender-deep", step.status === "pending" && "opacity-40")} />;
}

/**
 * A workflow run started from the chat. It follows the run live, lets you approve or answer right
 * here when it pauses, and shows the result when it's done.
 */
export function WorkflowRunCard({ item, delay = 0 }: { item: DynamicContent; delay?: number }) {
  const runId = (item.metadata?.runId as string | undefined) ?? "";
  const workflowId = (item.metadata?.workflowId as string | undefined) ?? "";
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [gone, setGone] = useState(false);
  const [note, setNote] = useState("");
  const [deciding, setDeciding] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  const load = useCallback(async () => {
    if (!runId) return setGone(true);
    try {
      setRun(await workflowApi.getRun(runId));
    } catch {
      setGone(true);
    }
  }, [runId]);

  useEffect(() => {
    void load();
  }, [load]);

  const status = run?.status;
  useEffect(() => {
    if (status !== "running") return;
    const t = setInterval(() => void load(), 1500);
    return () => clearInterval(t);
  }, [status, load]);

  const decide = async (approved: boolean) => {
    if (!run) return;
    setDeciding(approved ? "approve" : "reject");
    setError(null);
    try {
      setRun(await workflowApi.review(run.id, approved, note));
      setNote("");
    } catch (err) {
      setError(issuesMessage(err, "That didn't go through. Try again."));
    } finally {
      setDeciding(null);
    }
  };

  const waiting = run?.status === "waiting_for_review" ? run.steps[run.currentStep] : null;
  const asking = waiting?.kind === "Agent";
  const lastResult = run?.status === "completed" ? [...run.steps].reverse().find((s) => s.kind === "Agent" && s.summary) : null;
  const done = run?.steps.filter((s) => s.status === "done").length ?? 0;
  const st = run ? STATUS[run.status] : null;

  return (
    <article
      data-ui
      className="overflow-hidden rounded-[20px] border border-line bg-raised animate-rise-sm"
      style={{ animationDelay: `${delay}ms` } as CSSProperties}
    >
      <header className="flex items-center gap-2.5 px-4 pt-3.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-paper-2">
          <Workflow className="size-4 text-clay-ink" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] text-ink-soft">Workflow</p>
          <h4 className="truncate font-serif text-[16.5px] leading-tight font-medium">{item.title || run?.workflowTitle || "Workflow"}</h4>
        </div>
        {st && <span className={cn("inline-flex h-[22px] shrink-0 items-center rounded-full px-2.5 text-[12px] font-medium", st.className)}>{st.label}</span>}
      </header>

      <div className="px-4 pt-3 pb-4">
        {gone && <p className="text-[14px] text-ink-soft">This run is no longer available.</p>}
        {!run && !gone && (
          <p className="flex items-center gap-2 text-[14px] text-ink-soft">
            <Blossom size={16} motion="loading" /> Loading the run…
          </p>
        )}

        {run && (
          <>
            {run.steps.length > 0 && (
              <div className="mb-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2" aria-hidden>
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-700", run.status === "failed" ? "bg-danger" : "bg-leaf")}
                    style={{ width: `${(done / run.steps.length) * 100}%` }}
                  />
                </div>
                <span className="text-[12.5px] tabular-nums text-ink-faint">
                  {done}/{run.steps.length}
                </span>
              </div>
            )}

            <ol className="space-y-1">
              {run.steps.map((s, i) => {
                const current = isActive(run) && i === run.currentStep;
                const open = showSteps && Boolean(s.summary || s.error);
                return (
                  <li key={s.nodeId}>
                    <div className={cn("flex items-center gap-2.5 rounded-xl px-2 py-1.5", current && "bg-paper-2")}>
                      <span className="flex size-5 shrink-0 items-center justify-center">
                        <StepMark step={s} />
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-[14px]",
                          s.status === "pending" || s.status === "skipped" ? "text-ink-faint" : "text-ink",
                          current && "font-medium"
                        )}
                      >
                        {stepName(s)}
                      </span>
                      {s.status === "done" && s.finishedAt && <span className="text-[12px] text-ink-faint">{formatTime(s.finishedAt)}</span>}
                      {s.status === "done" && !s.finishedAt && <Check className="size-3.5 text-sage-deep" />}
                    </div>
                    {s.status === "failed" && s.error && <p className="ml-9 text-[13px] text-danger">{s.error}</p>}
                    {open && s.summary && (
                      <div className="mt-1 mb-2 ml-9">
                        <Markdown text={s.summary} className="text-[14px]" />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>

            {lastResult?.summary && !showSteps && (
              <div className="mt-3 rounded-2xl bg-paper-2/70 px-3.5 py-3">
                <p className="mb-1 text-[12.5px] font-medium text-ink-soft">Result</p>
                <Markdown text={lastResult.summary} className="text-[14.5px]" />
              </div>
            )}

            {waiting && (
              <div className="mt-3 space-y-2.5 rounded-2xl bg-lavender-wash/60 p-3.5">
                {/* what the reviewer is approving: the latest finished agent's result */}
                {!asking &&
                  (() => {
                    const before = run.steps
                      .slice(0, run.currentStep)
                      .reverse()
                      .find((s) => s.kind === "Agent" && s.summary);
                    return before?.summary ? (
                      <div className="max-h-56 overflow-y-auto rounded-xl bg-raised px-3 py-2.5">
                        <p className="mb-1 text-[12px] text-ink-soft">From {stepName(before)}</p>
                        <Markdown text={before.summary} className="text-[14px]" />
                      </div>
                    ) : null;
                  })()}
                <p className="text-[14px] font-medium text-ink">
                  {asking ? waiting.question : waiting.message || "Approve to carry on, or reject to stop here."}
                </p>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={asking ? "Your answer" : "Optional note for the next steps"}
                  rows={2}
                  className="bg-raised"
                />
                {error && <p className="text-[13px] text-danger">{error}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" disabled={deciding !== null} onClick={() => decide(false)}>
                    {deciding === "reject" ? <Blossom size={14} motion="loading" /> : <X className="size-3.5" />}
                    {asking ? "Stop" : "Reject"}
                  </Button>
                  <Button size="sm" className="flex-1" disabled={deciding !== null || (asking && !note.trim())} onClick={() => decide(true)}>
                    {deciding === "approve" ? <Blossom size={14} motion="loading" /> : <Check className="size-3.5" />}
                    {asking ? "Answer and continue" : "Approve"}
                  </Button>
                </div>
              </div>
            )}

            {run.status === "failed" && run.error && !run.steps.some((s) => s.status === "failed") && (
              <p className="mt-3 rounded-2xl bg-danger-wash px-3.5 py-2.5 text-[13.5px] text-ink">{run.error}</p>
            )}
          </>
        )}
      </div>

      {run && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-paper-2/50 px-3 py-2">
          <button
            type="button"
            onClick={() => setShowSteps((v) => !v)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink hover:bg-paper-3"
          >
            <ChevronDown className={cn("size-3.5 text-ink-soft transition-transform", showSteps && "rotate-180")} />
            {showSteps ? "Hide step details" : "Step details"}
          </button>
          {workflowId && (
            <Link to={`/workflow/${workflowId}`} className="ml-auto inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium text-ink-soft hover:bg-paper-3 hover:text-ink">
              Open workflow
            </Link>
          )}
        </footer>
      )}
    </article>
  );
}
