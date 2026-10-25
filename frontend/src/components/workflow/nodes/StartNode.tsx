import { memo } from "react";
import { Position, type NodeProps } from "@xyflow/react";
import { Play } from "lucide-react";
import { Dot, NodeShell, TONES } from "./NodeShell";

const StartNode = memo(({ selected }: NodeProps) => (
  <NodeShell
    tone={TONES.start}
    selected={selected}
    title="Start"
    subtitle="Runs when you press Run"
    icon={<Play className="size-[18px] fill-current" />}
  >
    <Dot type="source" position={Position.Right} tone={TONES.start} />
  </NodeShell>
));

StartNode.displayName = "StartNode";
export default StartNode;
