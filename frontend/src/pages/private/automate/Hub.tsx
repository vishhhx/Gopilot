import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { axiosInstance } from "@/utils";
import { errorMessage, formatDate, plural } from "@/lib/format";
import { servicesInNodes, SERVICE_ORDER, SERVICES, type ServiceId } from "@/lib/services";
import { copyHubWorkflow, type HubWorkflow } from "@/lib/hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Blossom } from "@/components/bloom/Blossom";
import { PersonBadge } from "@/components/responses/shared";
import ErrorState from "@/components/Other/common/ErrorState";
import { AppLogo } from "@/components/bloom/AppLogo";

type Sort = "newest" | "oldest";

function HubCard({ wf, index, onCopy, copying }: { wf: HubWorkflow; index: number; onCopy: () => void; copying: boolean }) {
  const used = servicesInNodes(wf.nodes);
  return (
    <article
      className="group flex h-full flex-col rounded-[24px] bg-raised p-5 shadow-[0_0_0_1px_var(--line)] transition-[transform,box-shadow] duration-300 animate-rise-sm hover:-translate-y-1 hover:shadow-[0_0_0_1px_var(--line-strong),var(--float-shadow)]"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <div className="flex items-start gap-4">
        <Blossom
          size={52}
          active={used.length ? used : []}
          className="transition-transform duration-700 ease-[var(--ease-bloom)] group-hover:rotate-[60deg]"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[19px] leading-snug font-medium tracking-[-0.01em]">
            <Link to={`/hub/${wf._id}`} className="after:absolute after:inset-0 focus:outline-none">
              {wf.title || "Untitled workflow"}
            </Link>
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-faint">
            {plural(wf.nodes?.length ?? 0, "node")}
            {used.length > 0 && `, works in ${used.map((s) => SERVICES[s].name).join(" and ")}`}
          </p>
        </div>
      </div>
      <p className="mt-3 line-clamp-3 flex-1 text-[14.5px] leading-relaxed text-ink-soft">{wf.description || "No description."}</p>
      {wf.promts && wf.promts.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {wf.promts.slice(0, 2).map((p) => (
            <li key={p} className="max-w-full truncate rounded-full bg-lavender-wash px-2.5 py-1 text-[12.5px] text-lavender-deep">
              "{p}"
            </li>
          ))}
          {wf.promts.length > 2 && <li className="rounded-full bg-paper-2 px-2.5 py-1 text-[12.5px] text-ink-soft">and {wf.promts.length - 2} more</li>}
        </ul>
      )}
      <div className="mt-4 flex items-center gap-2.5 border-t border-line pt-4">
        <PersonBadge name={wf.uploader?.name} email={wf.uploader?.email} size={28} />
        <div className="min-w-0 flex-1 text-[13px] leading-tight">
          <p className="truncate font-medium text-ink">{wf.uploader?.name || "Someone"}</p>
          <p className="text-ink-faint">{formatDate(wf.createdAt)}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={onCopy} disabled={copying} className="relative z-10">
          {copying ? <Blossom size={14} motion="loading" /> : <Copy className="size-3.5" />}
          {copying ? "Copying" : "Copy"}
        </Button>
      </div>
    </article>
  );
}

export function HubPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<HubWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [app, setApp] = useState<ServiceId | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axiosInstance.get("/hub/hub");
      setWorkflows(data?.data || []);
    } catch (err) {
      setError(errorMessage(err, "Agent Hub didn't load."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorkflows();
  }, [fetchWorkflows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workflows
      .filter(
        (wf) =>
          !q ||
          wf.title?.toLowerCase().includes(q) ||
          wf.description?.toLowerCase().includes(q) ||
          wf.promts?.some((p) => p.toLowerCase().includes(q)) ||
          wf.uploader?.name?.toLowerCase().includes(q)
      )
      .filter((wf) => !app || servicesInNodes(wf.nodes).includes(app))
      .sort((a, b) => {
        const d = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return sort === "newest" ? d : -d;
      });
  }, [workflows, query, sort, app]);

  const copy = async (wf: HubWorkflow) => {
    try {
      setCopyingId(wf._id);
      const newId = await copyHubWorkflow(wf._id);
      toast.success(`Copied "${wf.title || "workflow"}" to your workflows`, {
        action: newId ? { label: "Open", onClick: () => navigate(`/workflow/${newId}`) } : undefined,
      });
    } catch (err) {
      toast.error("The workflow wasn't copied", { description: errorMessage(err, "Try again in a moment.") });
    } finally {
      setCopyingId(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1180px] px-5 pt-10 pb-16 sm:px-8 sm:pt-14">
        <header className="animate-rise">
          <h1 className="font-serif text-[clamp(32px,4vw,44px)] leading-[1.05] font-normal tracking-[-0.025em]">Agent Hub</h1>
          <p className="mt-2 max-w-[56ch] text-[16px] text-ink-soft">
            Workflows other people built and shared. Copy one into your workspace, then change anything you like.
          </p>
        </header>

        <div className="sticky top-0 z-10 -mx-5 mt-8 flex flex-col gap-3 bg-paper/95 px-5 py-3 sm:-mx-8 sm:px-8 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search Agent Hub</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, prompt or author"
              className="h-11 rounded-full pl-10"
            />
          </label>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by app">
            {SERVICE_ORDER.map((id) => {
              const on = app === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setApp(on ? null : id)}
                  title={SERVICES[id].name}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full pr-3 pl-1.5 text-[13.5px] transition-colors",
                    on ? cn(SERVICES[id].bgWash, SERVICES[id].textDeep, "font-medium") : "text-ink-soft hover:bg-paper-2"
                  )}
                >
                  <AppLogo service={id} size={20} className={cn("transition-transform duration-500", on && "scale-110")} />
                  {SERVICES[id].name}
                </button>
              );
            })}
            <span className="mx-1 hidden h-5 w-px bg-line lg:block" />
            <div className="inline-flex rounded-full bg-paper-2 p-0.5" role="radiogroup" aria-label="Sort">
              {(["newest", "oldest"] as Sort[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={sort === s}
                  onClick={() => setSort(s)}
                  className={cn(
                    "h-8 rounded-full px-3 text-[13px] capitalize transition-colors",
                    sort === s ? "bg-raised text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-ink-soft hover:text-ink"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <ErrorState title="Agent Hub didn't load" description={error} onRetry={fetchWorkflows} className="mt-12" />}

        {loading && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="space-y-3 rounded-[24px] bg-raised p-5 shadow-[0_0_0_1px_var(--line)]">
                <div className="flex gap-4">
                  <Skeleton className="size-[52px] rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3.5 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-14 w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && (
          <>
            <p className="mt-4 text-[13.5px] text-ink-soft" aria-live="polite">
              {shown.length === workflows.length ? plural(workflows.length, "workflow") : `${shown.length} of ${plural(workflows.length, "workflow")}`}
            </p>
            {shown.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Blossom size={56} active={app ? [app] : []} motion="sway" />
                <h2 className="mt-5 font-serif text-[24px]">{workflows.length ? "No workflows match" : "The Hub is empty so far"}</h2>
                <p className="mt-2 max-w-[42ch] text-[15px] text-ink-soft">
                  {workflows.length
                    ? "Try another word, or clear the app filter."
                    : "Share one of your own workflows from its canvas and it will appear here for everyone."}
                </p>
                {workflows.length > 0 && (
                  <Button variant="outline" className="mt-5" onClick={() => (setQuery(""), setApp(null))}>
                    Clear search and filter
                  </Button>
                )}
              </div>
            ) : (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((wf, i) => (
                  <li key={wf._id} className="relative">
                    <HubCard wf={wf} index={i} copying={copyingId === wf._id} onCopy={() => copy(wf)} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
