import { memo } from "react";
import { Position, type NodeProps } from "@xyflow/react";
import { Flag } from "lucide-react";
import { Dot, NodeShell, TONES } from "./NodeShell";

const EndNode = memo(({ selected }: NodeProps) => (
  <NodeShell tone={TONES.end} selected={selected} title="End" subtitle="The run finishes here" icon={<Flag className="size-[18px]" />}>
    <Dot type="target" position={Position.Left} tone={TONES.end} />
  </NodeShell>
));

EndNode.displayName = "EndNode";
export default EndNode;
