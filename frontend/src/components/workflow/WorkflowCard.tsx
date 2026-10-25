import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatRelative, plural } from "@/lib/format";
import { servicesInNodes, SERVICES } from "@/lib/services";
import { Blossom } from "@/components/bloom/Blossom";
import { AppLogo } from "@/components/bloom/AppLogo";

export type Workflow = {
  _id: string;
  title?: string;
  description?: string;
  updatedAt?: string;
  nodes?: { type?: string; data?: Record<string, unknown> | null }[];
  edges?: unknown[];
};

/** A workflow as a small plot: its blossom shows which apps its agents work in. */
export function WorkflowCard({ wf, index = 0 }: { wf: Workflow; index?: number }) {
  const used = servicesInNodes(wf.nodes);
  const count = wf.nodes?.length ?? 0;
  return (
    <Link
      to={`/workflow/${wf._id}`}
      className="group flex h-full flex-col rounded-[24px] bg-raised p-2 shadow-[0_0_0_1px_var(--line)] transition-[transform,box-shadow] duration-300 ease-[var(--ease-soft)] animate-rise-sm hover:-translate-y-1 hover:shadow-[0_0_0_1px_var(--line-strong),var(--float-shadow)]"
      style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
    >
      <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-[18px] bg-paper-2">
        <Blossom
          size={76}
          active={used.length ? used : []}
          className="transition-transform duration-700 ease-[var(--ease-bloom)] group-hover:scale-110 group-hover:rotate-[30deg]"
        />
        <div className="absolute bottom-2.5 left-3 flex gap-1">
          {used.map((s) => (
            <span key={s} title={SERVICES[s].name} className={cn("flex size-7 items-center justify-center rounded-full", SERVICES[s].bgWash)}>
              <AppLogo service={s} size={18} badge={false} />
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col px-3 pt-3.5 pb-2">
        <h3 className="truncate font-serif text-[19px] leading-snug font-medium tracking-[-0.01em] text-ink">{wf.title || "Untitled workflow"}</h3>
        <p className="mt-1 line-clamp-2 flex-1 text-[14px] leading-relaxed text-ink-soft">{wf.description || "No description yet."}</p>
        <p className="mt-3 flex items-center justify-between text-[12.5px] text-ink-faint">
          <span>{count ? plural(count, "node") : "Empty"}</span>
          {wf.updatedAt && <span>Edited {formatRelative(wf.updatedAt).toLowerCase()}</span>}
        </p>
      </div>
    </Link>
  );
}
