import { memo } from "react";
import { Position, type NodeProps } from "@xyflow/react";
import { TriangleAlert } from "lucide-react";
import { Dot, NodeShell, TONES } from "./NodeShell";

const ErrorHandlerNode = memo(({ data, selected }: NodeProps) => {
  const d = data as { message?: string; isError?: boolean; error?: string };
  return (
    <NodeShell
      tone={TONES.error}
      selected={selected}
      title="Error handler"
      subtitle={d?.message || "Catches anything that fails"}
      icon={<TriangleAlert className="size-[18px]" />}
    >
      {d?.isError && d?.error && (
        <p className="mt-2.5 rounded-xl bg-danger-wash px-3 py-2 text-[12px] leading-snug break-words text-danger">{d.error}</p>
      )}
      <Dot type="target" position={Position.Left} tone={TONES.error} />
    </NodeShell>
  );
});

ErrorHandlerNode.displayName = "ErrorHandlerNode";
export default ErrorHandlerNode;
