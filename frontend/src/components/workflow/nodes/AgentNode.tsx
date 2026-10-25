import { memo } from "react";
import { Position, type NodeProps } from "@xyflow/react";
import { Bot } from "lucide-react";
import { humanizeAgentName, resolveService, SERVICES } from "@/lib/services";
import { useNodeStatus, useWorkflowInputs } from "../nodeStatus";
import { TaskText } from "../TaskText";
import { Dot, NodeShell, type Tone } from "./NodeShell";
import { AppLogo } from "@/components/bloom/AppLogo";

const NEUTRAL: Tone = { petal: "var(--clay)", wash: "var(--paper-2)", deep: "var(--ink-soft)" };

/** One agent, drawn in its app's flower. Data: { service, name, description, task }. */
const AgentNode = memo(({ id: nodeId, data, selected }: NodeProps) => {
  const d = data as { service?: string; name?: string; description?: string; task?: string };
  const status = useNodeStatus(nodeId);
  const inputs = useWorkflowInputs();
  const id = resolveService(d.service) ?? resolveService(d.name);
  const svc = id ? SERVICES[id] : null;
  const tone: Tone = svc ? { petal: svc.petal, wash: svc.wash, deep: svc.deep } : NEUTRAL;

  return (
    <NodeShell
      tone={tone}
      selected={selected}
      caption={svc ? `${svc.name} agent` : "Agent"}
      title={humanizeAgentName(d.name)}
      subtitle={d.task?.trim() ? <TaskText text={d.task} inputs={inputs} /> : d.description}
      status={status}
      icon={id ? <AppLogo service={id} size={28} bloom /> : <Bot className="size-5" />}
    >
      <Dot type="target" position={Position.Left} tone={tone} />
      <Dot type="source" position={Position.Right} tone={tone} />
    </NodeShell>
  );
});

AgentNode.displayName = "AgentNode";
export default AgentNode;
