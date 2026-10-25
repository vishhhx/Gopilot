import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Play, Search, Workflow } from "lucide-react";
import { plural, formatDate } from "@/lib/format";
import { servicesInNodes } from "@/lib/services";
import { issuesMessage, workflowApi, type Plan, type WorkflowSummary } from "@/lib/workflow";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Blossom } from "@/components/bloom/Blossom";
import { AppLogo } from "@/components/bloom/AppLogo";
import { PlanPreview, RunInputsForm } from "@/components/workflow/RunForm";

const agentCount = (wf: WorkflowSummary) => (wf.nodes ?? []).filter((n) => n.type === "Agent").length;

/**
 * Run one of your workflows from the chat: pick it, fill in its inputs, and its progress appears as
 * a card in the conversation.
 */
export function WorkflowPicker({
  open,
  setOpen,
  onRun,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  /** starts the run in the chat; throws to show an error */
  onRun: (workflow: WorkflowSummary, values: Record<string, string>) => Promise<void>;
}) {
  const [workflows, setWorkflows] = useState<WorkflowSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<WorkflowSummary | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState<Plan | null>(null);
  const [checking, setChecking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setChosen(null);
    setQuery("");
    setLoadError(null);
    workflowApi
      .list()
      .then(setWorkflows)
      .catch((err) => setLoadError(issuesMessage(err, "Your workflows didn't load.")));
  }, [open]);

  const choose = (wf: WorkflowSummary) => {
    setChosen(wf);
    setValues({});
    setError(null);
    setPlan(null);
    setChecking(true);
    workflowApi
      .check(wf._id)
      .then(setPlan)
      .catch((err) => setError(issuesMessage(err, "This workflow couldn't be checked.")))
      .finally(() => setChecking(false));
  };

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => (workflows ?? []).filter((w) => !q || `${w.title} ${w.description}`.toLowerCase().includes(q)),
    [workflows, q]
  );

  const inputs = chosen?.inputs ?? [];
  const missing = inputs.filter((f) => f.required && !values[f.key]?.trim());
  const blocked = Boolean(plan?.errors.length);

  const start = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!chosen || blocked) return;
    if (missing.length) return setError(`Fill in ${missing.map((f) => `"${f.label}"`).join(", ")}.`);
    try {
      setStarting(true);
      setError(null);
      await onRun(chosen, values);
      setOpen(false);
    } catch (err) {
      setError(issuesMessage(err, "The workflow didn't start."));
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !starting && setOpen(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        {!chosen ? (
          <div className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Run a workflow</DialogTitle>
              <DialogDescription>Pick one of your workflows. Its progress shows up right here in the chat.</DialogDescription>
            </DialogHeader>
            <label className="relative block">
              <span className="sr-only">Search workflows</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search workflows" className="h-10 rounded-full pl-9" autoFocus />
            </label>

            {loadError && <p className="rounded-2xl bg-danger-wash px-4 py-2.5 text-[14px] text-ink">{loadError}</p>}
            {!workflows && !loadError && (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-[68px] w-full rounded-2xl" />
                ))}
              </div>
            )}
            {workflows && workflows.length === 0 && (
              <div className="rounded-[20px] bg-paper-2 px-5 py-6 text-center">
                <Workflow className="mx-auto size-6 text-ink-faint" />
                <p className="mt-2 font-medium text-ink">No workflows yet</p>
                <p className="mt-1 text-[14px] text-ink-soft">Build one once, then run it from any chat.</p>
                <Button asChild size="sm" className="mt-4">
                  <Link to="/workflow" onClick={() => setOpen(false)}>
                    Create a workflow
                  </Link>
                </Button>
              </div>
            )}
            {workflows && workflows.length > 0 && shown.length === 0 && (
              <p className="py-6 text-center text-[14px] text-ink-soft">Nothing matches "{query}".</p>
            )}
            <ul className="space-y-1.5">
              {shown.map((wf) => {
                const services = servicesInNodes(wf.nodes);
                const steps = agentCount(wf);
                return (
                  <li key={wf._id}>
                    <button
                      type="button"
                      onClick={() => choose(wf)}
                      className="group flex w-full items-center gap-3 rounded-2xl bg-paper-2 px-3.5 py-3 text-left transition-colors hover:bg-paper-3"
                    >
                      <span className="flex shrink-0 -space-x-1.5">
                        {services.length ? (
                          services.slice(0, 3).map((s) => (
                            <span key={s} className="flex size-8 items-center justify-center rounded-full bg-raised ring-2 ring-paper-2">
                              <AppLogo service={s} size={18} badge={false} />
                            </span>
                          ))
                        ) : (
                          <span className="flex size-8 items-center justify-center rounded-full bg-raised">
                            <Workflow className="size-4 text-ink-faint" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-ink">{wf.title || "Untitled workflow"}</span>
                        <span className="block truncate text-[13px] text-ink-soft">
                          {[plural(steps, "step"), wf.inputs?.length ? plural(wf.inputs.length, "input") : null, wf.updatedAt ? `edited ${formatDate(wf.updatedAt)}` : null]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <form onSubmit={start} className="grid gap-5">
            <DialogHeader>
              <button
                type="button"
                onClick={() => setChosen(null)}
                className="mb-1 inline-flex w-fit items-center gap-1 text-[13px] text-ink-soft hover:text-ink"
              >
                <ArrowLeft className="size-3.5" />
                All workflows
              </button>
              <DialogTitle>{chosen.title || "Untitled workflow"}</DialogTitle>
              <DialogDescription>
                {chosen.description || (inputs.length ? "Fill in this run's details." : "Ready to run.")}
              </DialogDescription>
            </DialogHeader>

            <RunInputsForm inputs={inputs} values={values} onChange={setValues} idPrefix="chat-run" />

            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-soft">What it will do</p>
              <PlanPreview plan={plan} loading={checking} inputs={inputs} values={values} />
            </div>

            {error && (
              <p role="alert" className="rounded-2xl bg-danger-wash px-4 py-2.5 text-[14px] text-ink">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={starting}>
                Cancel
              </Button>
              <Button type="submit" disabled={starting || checking || blocked || !plan}>
                {starting ? <Blossom size={16} motion="loading" /> : <Play className="size-3.5 fill-current" />}
                {starting ? "Starting" : "Run in chat"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
