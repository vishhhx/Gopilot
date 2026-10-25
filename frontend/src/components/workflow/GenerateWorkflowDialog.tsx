import { useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import { CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { axiosInstance } from "@/utils";
import { errorMessage, plural } from "@/lib/format";
import { humanizeAgentName, servicesInNodes, SERVICES, type ServiceId } from "@/lib/services";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Blossom } from "@/components/bloom/Blossom";
import { Thinking } from "@/components/chat/Thinking";
import type { InputField } from "@/lib/workflow";
import { AppLogo } from "@/components/bloom/AppLogo";

interface GeneratedWorkflow {
  title: string;
  nodes: Node[];
  edges: Edge[];
  inputs: InputField[];
  agentsUsed: string[];
  metadata: { totalNodes: number; totalEdges: number };
}

const IDEAS: { services: ServiceId[]; title: string; prompt: string }[] = [
  { services: ["gmail"], title: "Reply to urgent mail", prompt: "Read new emails, check if any are urgent, then send a reply to those" },
  { services: ["sheets", "gmail"], title: "Email a sheet summary", prompt: "Read data from my sheet, summarize it, and send the summary by email" },
  { services: ["gmail", "sheets"], title: "Log mail to a sheet", prompt: "Read emails and write the important details to Google Sheets" },
  { services: ["gmail"], title: "Acknowledge new mail", prompt: "Watch my inbox and send an acknowledgement to each new email" },
  { services: ["gmail", "sheets"], title: "Track inbox stats", prompt: "Read Gmail and update a sheet with counts of emails by sender" },
  { services: ["calendar", "gmail"], title: "Send my schedule", prompt: "Read my calendar for a given day and email the schedule to a person I choose, after I approve it" },
  { services: ["forms", "gmail"], title: "Feedback form", prompt: "Create a feedback form about a topic I give and email the link to a recipient" },
];

export function GenerateWorkflowDialog({
  open,
  setOpen,
  onCreated,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onCreated: (wf: { nodes: Node[]; edges: Edge[]; inputs: InputField[] }) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedWorkflow | null>(null);

  const generate = async () => {
    setError(null);
    setResult(null);
    if (!prompt.trim()) return setError("Describe what the workflow should do.");
    try {
      setLoading(true);
      const { data } = await axiosInstance.post("/others/generate-workflow", { prompt: prompt.trim() });
      if (!data.success || !data.data) throw new Error(data.error || "No workflow came back.");
      const wf: GeneratedWorkflow = data.data;
      setResult(wf);
      onCreated({ nodes: wf.nodes, edges: wf.edges, inputs: wf.inputs ?? [] });
    } catch (err) {
      setError(errorMessage(err, "GoPilot couldn't build that workflow. Try describing it another way."));
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    if (loading) return;
    setOpen(false);
    setPrompt("");
    setError(null);
    setResult(null);
  };

  const used = result ? servicesInNodes(result.nodes as never) : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-paper-2">
              <Blossom size={28} motion={loading ? "loading" : "bloom"} />
            </span>
            <div>
              <DialogTitle>Build with AI</DialogTitle>
              <DialogDescription>Describe the job and GoPilot lays out and connects the nodes.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!loading && !result && (
          <div className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="workflow-prompt">What should it automate?</Label>
              <Textarea
                id="workflow-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void generate();
                }}
                placeholder="For example: read emails, check if any are urgent, then send a reply"
                className="min-h-[110px] text-[16px]"
                autoFocus
              />
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-soft">Or start from an idea</p>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {IDEAS.map((idea) => (
                  <li key={idea.title}>
                    <button
                      type="button"
                      onClick={() => setPrompt(idea.prompt)}
                      className={cn(
                        "group flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors",
                        prompt === idea.prompt ? "bg-paper-3" : "bg-paper-2 hover:bg-paper-3"
                      )}
                    >
                      <span className="flex shrink-0 -space-x-2 pt-0.5">
                        {idea.services.map((s) => (
                          <AppLogo key={s} service={s} size={20} badge={false} className="rounded-md bg-raised p-0.5 transition-transform duration-500 group-hover:scale-110" />
                        ))}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium text-ink">{idea.title}</span>
                        <span className="line-clamp-2 block text-[12.5px] leading-snug text-ink-soft">{idea.prompt}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-5">
            <p className="ml-auto max-w-[85%] rounded-[22px] rounded-br-md bg-paper-3/70 px-4 py-2.5 text-[15px]">{prompt}</p>
            <Thinking steps={["Reading what you want", "Choosing the agents", "Placing the nodes", "Connecting them"]} every={2200} />
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4 animate-rise-sm">
            <div className="flex items-start gap-3 rounded-[20px] bg-sage-wash p-4">
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-sage-deep" />
              <div>
                <p className="font-medium text-ink">Your workflow is on the canvas</p>
                <p className="text-[14px] text-ink-soft">
                  {plural(result.metadata.totalNodes, "node")} and {plural(result.metadata.totalEdges, "connection")}. Click a step to adjust its task.
                </p>
              </div>
            </div>
            {result.inputs?.length > 0 && (
              <div>
                <p className="mb-2 text-[13px] font-medium text-ink-soft">It asks for these each run</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.inputs.map((f) => (
                    <span key={f.key} className="inline-flex h-7 items-center rounded-full bg-paper-2 px-3 text-[13px]">
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {result.agentsUsed.length > 0 && (
              <div>
                <p className="mb-2 text-[13px] font-medium text-ink-soft">Agents it uses</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.agentsUsed.map((a) => (
                    <span key={a} className="inline-flex h-7 items-center rounded-full bg-paper-2 px-3 text-[13px]">
                      {humanizeAgentName(a)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {used.length > 0 && (
              <p className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                Works in {used.map((s) => SERVICES[s].name).join(", ")}
              </p>
            )}
          </div>
        )}

        {error && !loading && (
          <p role="alert" className="rounded-2xl bg-danger-wash px-4 py-2.5 text-[14px] text-ink">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={loading}>
            {result ? "Close" : "Cancel"}
          </Button>
          {result ? (
            <Button onClick={close}>Use this workflow</Button>
          ) : (
            <Button onClick={generate} disabled={loading || !prompt.trim()}>
              <Blossom size={16} motion={loading ? "loading" : "none"} />
              {loading ? "Building" : "Build workflow"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
