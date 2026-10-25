import { useEffect, useState, type KeyboardEvent } from "react";
import type { Edge, Node } from "@xyflow/react";
import { Plus, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { axiosInstance } from "@/utils";
import { errorMessage, plural } from "@/lib/format";
import { servicesInNodes } from "@/lib/services";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Blossom } from "@/components/bloom/Blossom";

interface UploadToHubDialogProps {
  open: boolean;
  setOpen: (v: boolean) => void;
  title?: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  onUploaded?: () => void;
}

export function UploadToHubDialog({
  open,
  setOpen,
  title: initialTitle = "",
  description: initialDescription = "",
  nodes,
  edges,
  onUploaded,
}: UploadToHubDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setPrompts([]);
      setDraft("");
      setError(null);
    }
  }, [open, initialTitle, initialDescription]);

  const addPrompt = () => {
    const t = draft.trim();
    if (t && !prompts.includes(t)) setPrompts([...prompts, t]);
    setDraft("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPrompt();
    }
  };

  const share = async () => {
    setError(null);
    if (!title.trim()) return setError("Give the workflow a title.");
    if (nodes.length === 0) return setError("Add at least one node before sharing.");
    try {
      setLoading(true);
      await axiosInstance.post("/hub/upload", {
        title: title.trim(),
        description: description.trim(),
        nodes,
        edges,
        promts: prompts.length > 0 ? prompts : undefined,
      });
      toast.success("Shared to Agent Hub");
      onUploaded?.();
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err, "The workflow wasn't shared."));
    } finally {
      setLoading(false);
    }
  };

  const used = servicesInNodes(nodes as never);

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Share to Agent Hub</DialogTitle>
          <DialogDescription>Anyone using GoPilot can find it there and copy it into their own workspace.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 rounded-[20px] bg-paper-2 p-4">
          <Blossom size={44} active={used.length ? used : []} motion="bloom" />
          <p className="text-[14px] text-ink-soft">
            {plural(nodes.length, "node")} and {plural(edges.length, "connection")}
            {prompts.length > 0 && `, with ${plural(prompts.length, "example prompt")}`}
          </p>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="hub-title">Title</Label>
            <Input id="hub-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Invoice logger" disabled={loading} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hub-desc">What it does</Label>
            <Textarea
              id="hub-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reads invoices from Gmail and logs each one to a sheet."
              rows={3}
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hub-prompts">Example prompts</Label>
            <p className="-mt-1 text-[13px] text-ink-soft">Optional. Show people what to type when they run it. Press Enter to add each one.</p>
            <div className="flex gap-2">
              <Input id="hub-prompts" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} placeholder="Log this week's invoices" disabled={loading} />
              <Button type="button" variant="outline" size="icon" onClick={addPrompt} disabled={!draft.trim() || loading} aria-label="Add prompt">
                <Plus className="size-4" />
              </Button>
            </div>
            {prompts.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 pt-1">
                {prompts.map((p, i) => (
                  <li key={p} className="inline-flex h-8 items-center gap-1 rounded-full bg-lavender-wash pr-1 pl-3 text-[13px] text-lavender-deep animate-bloom">
                    {p}
                    <button
                      type="button"
                      onClick={() => setPrompts(prompts.filter((_, j) => j !== i))}
                      className="inline-flex size-6 items-center justify-center rounded-full hover:bg-raised"
                      aria-label={`Remove ${p}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-2xl bg-danger-wash px-4 py-2.5 text-[14px] text-ink">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={share} disabled={loading || !title.trim()}>
            {loading ? <Blossom size={16} motion="loading" /> : <Share2 className="size-4" />}
            {loading ? "Sharing" : "Share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
