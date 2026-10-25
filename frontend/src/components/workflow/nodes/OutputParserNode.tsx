import { memo } from "react";
import { Position, type NodeProps } from "@xyflow/react";
import { Braces } from "lucide-react";
import { Blossom } from "@/components/bloom/Blossom";
import { Dot, NodeShell, TONES } from "./NodeShell";

const OutputParserNode = memo(({ data, selected }: NodeProps) => {
  const d = data as { message?: string; isExecuting?: boolean };
  return (
    <NodeShell
      tone={TONES.parser}
      selected={selected}
      title="Output parser"
      subtitle={d?.isExecuting ? "Parsing output…" : d?.message || "Shapes the result into clean data"}
      icon={d?.isExecuting ? <Blossom size={24} motion="loading" /> : <Braces className="size-[18px]" />}
    >
      <Dot type="target" position={Position.Left} tone={TONES.parser} />
      <Dot type="source" position={Position.Right} tone={TONES.parser} />
    </NodeShell>
  );
});

OutputParserNode.displayName = "OutputParserNode";
export default OutputParserNode;
