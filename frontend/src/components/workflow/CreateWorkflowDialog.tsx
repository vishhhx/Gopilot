import { useState, type FormEvent } from "react";
import { axiosInstance } from "@/utils";
import { errorMessage } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Blossom } from "@/components/bloom/Blossom";
import { cleanFields, type InputField } from "@/lib/workflow";
import { InputFieldsEditor } from "./InputFieldsEditor";
import type { Workflow } from "./WorkflowCard";

export function CreateWorkflowDialog({
  open,
  setOpen,
  onCreated,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onCreated: (wf: Workflow) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [inputs, setInputs] = useState<InputField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Give the workflow a name.");
    try {
      setLoading(true);
      const { data } = await axiosInstance.post("/workflow", {
        title: title.trim(),
        description: description.trim(),
        inputs: cleanFields(inputs),
      });
      onCreated(data?.data?.workflow || data?.data || data);
      setOpen(false);
      setTitle("");
      setDescription("");
      setInputs([]);
    } catch (err) {
      setError(errorMessage(err, "The workflow wasn't created."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>New workflow</DialogTitle>
            <DialogDescription>Name it now; you'll add the agents on the canvas next.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="wf-title">Name</Label>
            <Input id="wf-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly invoice logger" autoFocus />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wf-desc">What it does</Label>
            <Textarea
              id="wf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional. For example: reads invoices from Gmail and adds each to the Expenses sheet."
            />
          </div>
          <div className="grid gap-2">
            <div>
              <Label>Inputs for each run</Label>
              <p className="mt-0.5 text-[13px] text-ink-soft">What the Run dialog asks for, like a recipient or a date. Steps can use them in their task.</p>
            </div>
            <InputFieldsEditor fields={inputs} onChange={setInputs} />
          </div>
          {error && (
            <p role="alert" className="rounded-2xl bg-danger-wash px-4 py-2.5 text-[14px] text-ink">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Blossom size={16} motion="loading" />}
              {loading ? "Creating" : "Create workflow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
