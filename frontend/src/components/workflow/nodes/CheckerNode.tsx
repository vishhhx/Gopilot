import { memo } from "react";
import { Position, type NodeProps } from "@xyflow/react";
import { GitFork } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNodeStatus } from "../nodeStatus";
import { Dot, StatusDecor, TONES } from "./NodeShell";

/** Checks the step before it, drawn as a diamond: in at the top, out at the bottom. Data: { condition }. */
const CheckerNode = memo(({ id, data, selected }: NodeProps) => {
  const tone = TONES.checker;
  const status = useNodeStatus(id);
  const condition = (data as { condition?: string }).condition?.trim();
  return (
    <div
      className={cn("relative flex size-[132px] items-center justify-center animate-node-in", status?.run === "skipped" && "opacity-55")}
      title={condition ? `Continues only if: ${condition}` : "Continues if the step before it succeeded"}
    >
      <div
        className={cn(
          "absolute inset-[18px] rotate-45 rounded-[22px] border bg-raised shadow-float transition-[border-color,box-shadow] duration-300",
          selected ? "border-transparent" : "border-line"
        )}
        style={
          selected
            ? { boxShadow: `0 0 0 2px ${tone.petal}, 0 0 0 6px color-mix(in oklab, ${tone.petal} 25%, transparent), var(--float-shadow)` }
            : undefined
        }
      />
      <div className="relative flex flex-col items-center gap-1">
        <span className="flex size-9 items-center justify-center rounded-xl" style={{ background: tone.wash, color: tone.deep }}>
          <GitFork className="size-4 rotate-180" />
        </span>
        <span className="text-[13px] font-semibold text-ink">Checker</span>
      </div>
      <Dot type="target" position={Position.Top} tone={tone} />
      <Dot type="source" position={Position.Bottom} id="output" tone={tone} />
      <StatusDecor status={status} tone={tone} rounded="rounded-[28px]" />
    </div>
  );
});

CheckerNode.displayName = "CheckerNode";
export default CheckerNode;
