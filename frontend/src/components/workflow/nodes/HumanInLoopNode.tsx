import { memo } from "react";
import { Position, type NodeProps } from "@xyflow/react";
import { UserRoundCheck } from "lucide-react";
import { useNodeStatus } from "../nodeStatus";
import { Dot, NodeShell, TONES } from "./NodeShell";

/** Pauses the run until the user approves or rejects. Data: { message }. */
const HumanInLoopNode = memo(({ id, data, selected }: NodeProps) => {
  const status = useNodeStatus(id);
  const message = (data as { message?: string }).message?.trim();
  return (
    <NodeShell
      tone={TONES.review}
      selected={selected}
      title="Human review"
      subtitle={message || "Pauses for you to approve or reject"}
      icon={<UserRoundCheck className="size-[18px]" />}
      status={status}
    >
      <Dot type="target" position={Position.Left} tone={TONES.review} />
      <Dot type="source" position={Position.Right} tone={TONES.review} />
    </NodeShell>
  );
});

HumanInLoopNode.displayName = "HumanInLoopNode";
export default HumanInLoopNode;
