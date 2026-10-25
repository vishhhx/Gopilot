import type { CSSProperties, ReactNode } from "react";
import { Handle, Position, type HandleProps } from "@xyflow/react";
import { Check, Pause, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NodeStatus } from "../nodeStatus";

export interface Tone {
  /** fill for the handles and the selection ring */
  petal: string;
  /** background of the icon */
  wash: string;
  /** colour of the icon */
  deep: string;
}

export const TONES = {
  start: { petal: "var(--mint)", wash: "var(--mint-wash)", deep: "var(--mint-deep)" },
  end: { petal: "var(--clay)", wash: "var(--paper-3)", deep: "var(--clay-ink)" },
  checker: { petal: "var(--buttercup)", wash: "var(--buttercup-wash)", deep: "var(--buttercup-deep)" },
  error: { petal: "var(--danger)", wash: "var(--danger-wash)", deep: "var(--danger)" },
  review: { petal: "var(--lavender)", wash: "var(--lavender-wash)", deep: "var(--lavender-deep)" },
  parser: { petal: "var(--cornflower)", wash: "var(--cornflower-wash)", deep: "var(--cornflower-deep)" },
} satisfies Record<string, Tone>;

/** A connection point, in the node's flower colour. */
export function Dot({ tone, ...props }: Omit<HandleProps, "position"> & { tone: Tone; position: Position }) {
  return <Handle {...props} className="gp-handle" style={{ ["--h" as string]: tone.petal } as CSSProperties} />;
}

/** A ring and badge showing the node's step in the current run, and any problem with the node. */
export function StatusDecor({ status, tone, rounded = "rounded-[20px]" }: { status?: NodeStatus; tone: Tone; rounded?: string }) {
  const run = status?.run;
  return (
    <>
      {run === "running" && (
        <span
          aria-hidden
          className={cn("pointer-events-none absolute -inset-[5px] animate-pulse", rounded)}
          style={{ boxShadow: `0 0 0 3px ${tone.petal}` }}
        />
      )}
      {run === "waiting" && (
        <span aria-hidden className={cn("pointer-events-none absolute -inset-[5px]", rounded)} style={{ boxShadow: "0 0 0 3px var(--lavender)" }} />
      )}
      {run && run !== "pending" && run !== "running" && (
        <span
          className={cn(
            "absolute -top-2.5 -right-2.5 z-10 inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11.5px] font-medium shadow-float",
            run === "done" && "bg-sage-wash text-sage-deep",
            run === "failed" && "bg-danger-wash text-danger",
            run === "waiting" && "bg-lavender-wash text-lavender-deep",
            run === "skipped" && "bg-paper-2 text-ink-faint"
          )}
        >
          {run === "done" && <Check className="size-3" strokeWidth={3} />}
          {run === "failed" && <X className="size-3" strokeWidth={3} />}
          {run === "waiting" && <Pause className="size-3" />}
          {run === "done" ? "Done" : run === "failed" ? "Failed" : run === "waiting" ? "Waiting for you" : "Skipped"}
        </span>
      )}
      {status?.issue && (
        <p className="absolute top-full left-0 mt-1.5 flex w-[248px] items-start gap-1.5 text-[11.5px] leading-snug text-danger">
          <TriangleAlert className="mt-px size-3 shrink-0" />
          {status.issue}
        </p>
      )}
    </>
  );
}

/** The card every node is drawn on: a flower-tinted icon, a title and a line about what it does. */
export function NodeShell({
  tone,
  icon,
  title,
  subtitle,
  caption,
  selected,
  children,
  className,
  status,
}: {
  tone: Tone;
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  caption?: string;
  selected?: boolean;
  children?: ReactNode;
  className?: string;
  status?: NodeStatus;
}) {
  return (
    <div
      className={cn(
        "relative w-[248px] rounded-[20px] border bg-raised p-3 shadow-float transition-[border-color,box-shadow,transform,opacity] duration-300 animate-node-in",
        selected ? "border-transparent" : "border-line hover:-translate-y-0.5",
        status?.run === "skipped" && "opacity-55",
        className
      )}
      style={
        selected
          ? { boxShadow: `0 0 0 2px ${tone.petal}, 0 0 0 6px color-mix(in oklab, ${tone.petal} 25%, transparent), var(--float-shadow)` }
          : undefined
      }
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-[14px]"
          style={{ background: tone.wash, color: tone.deep }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          {caption && <p className="text-[11.5px] leading-tight font-medium" style={{ color: tone.deep }}>{caption}</p>}
          <p className="truncate text-[14.5px] leading-snug font-semibold text-ink">{title}</p>
          {subtitle && <p className="line-clamp-2 text-[12.5px] leading-snug text-ink-soft">{subtitle}</p>}
        </div>
      </div>
      {children}
      <StatusDecor status={status} tone={tone} />
    </div>
  );
}
