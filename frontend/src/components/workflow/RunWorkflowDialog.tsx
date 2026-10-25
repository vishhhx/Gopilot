import { useEffect, useState, type FormEvent } from "react";
import { Play } from "lucide-react";
import { issuesMessage, workflowApi, type InputField, type Plan, type WorkflowRun } from "@/lib/workflow";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Blossom } from "@/components/bloom/Blossom";
import { PlanPreview, RunInputsForm } from "./RunForm";

/**
 * Asks for the workflow's inputs and starts a run. Before that it saves the canvas and checks it,
 * so problems show up here instead of halfway through a run.
 */
export function RunWorkflowDialog({
  open,
  setOpen,
  workflowId,
  inputs,
  prepare,
  onStarted,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  workflowId?: string;
  inputs: InputField[];
  /** saves the canvas and returns the server's plan for it */
  prepare: () => Promise<Plan>;
  onStarted: (run: WorkflowRun) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState<Plan | null>(null);
  const [checking, setChecking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPlan(null);
    setChecking(true);
    prepare()
      .then(setPlan)
      .catch((err) => setError(issuesMessage(err, "The workflow couldn't be checked.")))
      .finally(() => setChecking(false));
  }, [open, prepare]);

  const missing = inputs.filter((f) => f.required && !values[f.key]?.trim());
  const blocked = Boolean(plan?.errors.length);

  const start = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!workflowId || blocked) return;
    if (missing.length) return setError(`Fill in ${missing.map((f) => `"${f.label}"`).join(", ")}.`);
    try {
      setStarting(true);
      setError(null);
      const run = await workflowApi.startRun(workflowId, values);
      onStarted(run);
      setOpen(false);
    } catch (err) {
      setError(issuesMessage(err, "The workflow didn't start."));
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !starting && setOpen(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[580px]">
        <form onSubmit={start} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Run this workflow</DialogTitle>
            <DialogDescription>
              {inputs.length ? "Fill in this run's details. Each step uses them as shown below." : "The steps below run in order."}
            </DialogDescription>
          </DialogHeader>

          <RunInputsForm inputs={inputs} values={values} onChange={setValues} />

          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-soft">Steps</p>
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
              {starting ? "Starting" : "Run"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
