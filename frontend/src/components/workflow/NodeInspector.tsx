import type { Node } from "@xyflow/react";
import { X } from "lucide-react";
import { humanizeAgentName, resolveService, SERVICES } from "@/lib/services";
import type { InputField } from "@/lib/workflow";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppLogo } from "@/components/bloom/AppLogo";
import { TaskEditor } from "./TaskEditor";

const COPY = {
  Agent: {
    field: "task",
    label: "What this step should do",
    hint: "Be specific. Results from earlier steps are passed in automatically.",
  },
  Checker: {
    field: "condition",
    label: "Continue only if…",
    hint: "Optional. Leave empty to just check that the step before succeeded.",
  },
  HIL: {
    field: "message",
    label: "What should you check here?",
    hint: "Shown when the run pauses for your approval.",
  },
} as const;

/** Settings for the selected step: an agent's task, a Checker's condition, or a review message. */
export function NodeInspector({
  node,
  inputs,
  onChange,
  onClose,
  onManageInputs,
  onCreateInput,
}: {
  node: Node;
  inputs: InputField[];
  onChange: (nodeId: string, patch: Record<string, unknown>) => void;
  onClose: () => void;
  onManageInputs: () => void;
  onCreateInput: (field: InputField) => void;
}) {
  const copy = COPY[node.type as keyof typeof COPY];
  if (!copy) return null;

  const data = (node.data ?? {}) as Record<string, string | undefined>;
  const value = data[copy.field] ?? "";
  const svcId = node.type === "Agent" ? resolveService(data.service) ?? resolveService(data.name) : null;
  const title =
    node.type === "Agent" ? humanizeAgentName(data.name) : node.type === "Checker" ? "Checker" : "Human review";
  const placeholder =
    node.type === "Agent"
      ? data.description
        ? `For example: ${data.description.toLowerCase()} from today`
        : "Describe the task"
      : node.type === "Checker"
        ? "For example: at least one invoice email was found"
        : "For example: check the draft before it's sent";

  return (
    <aside
      className="absolute top-3 right-3 z-20 w-[320px] max-w-[calc(100%-24px)] rounded-[24px] border border-line bg-raised p-4 shadow-float animate-rise-sm"
      aria-label="Step settings"
    >
      <div className="flex items-center gap-2.5">
        {svcId && <AppLogo service={svcId} size={26} />}
        <div className="min-w-0 flex-1">
          {svcId && <p className="text-[12px] text-ink-soft">{SERVICES[svcId].name} agent</p>}
          <h2 className="truncate font-serif text-[17px] font-medium">{title}</h2>
        </div>
        <Button variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label="Close step settings">
          <X className="size-4" />
        </Button>
      </div>
      <div className="mt-3 grid gap-1.5">
        <Label htmlFor="node-setting">{copy.label}</Label>
        {node.type === "HIL" ? (
          <Textarea
            id="node-setting"
            value={value}
            onChange={(e) => onChange(node.id, { [copy.field]: e.target.value })}
            placeholder={placeholder}
            rows={3}
            className="text-[14px]"
          />
        ) : (
          <TaskEditor
            id="node-setting"
            value={value}
            onChange={(v) => onChange(node.id, { [copy.field]: v })}
            inputs={inputs}
            placeholder={placeholder}
            onAddInput={onManageInputs}
            agentName={node.type === "Agent" ? data.name : undefined}
            onCreateInput={onCreateInput}
          />
        )}
        <p className="text-[12.5px] text-ink-faint">{copy.hint}</p>
      </div>
    </aside>
  );
}
