import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Network, Plus } from "lucide-react";
import { axiosInstance } from "@/utils";
import { errorMessage, plural } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Garden } from "@/components/bloom/Flowers";
import { BORDER } from "@/lib/garden";
import ErrorState from "@/components/Other/common/ErrorState";
import { WorkflowCard, type Workflow } from "@/components/workflow/WorkflowCard";
import { CreateWorkflowDialog } from "@/components/workflow/CreateWorkflowDialog";

interface Meta {
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

const PAGE_SIZE = 20;

export default function WorkFlowPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get("/workflow", { params: { page: p, pageSize: PAGE_SIZE } });
      setWorkflows(data?.data?.workflows || []);
      setMeta(data?.data?.meta || null);
    } catch (err) {
      setError(errorMessage(err, "Your workflows didn't load."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [page, load]);

  // a new workflow goes straight to its canvas
  const onCreated = (wf: Workflow) => {
    if (wf?._id) navigate(`/workflow/${wf._id}`);
    else void load(1);
  };

  const empty = !loading && !error && workflows.length === 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1180px] px-5 pt-10 pb-16 sm:px-8 sm:pt-14">
        <header className="flex flex-wrap items-end justify-between gap-5 animate-rise">
          <div>
            <h1 className="font-serif text-[clamp(32px,4vw,44px)] leading-[1.05] font-normal tracking-[-0.025em]">Workflows</h1>
            <p className="mt-2 max-w-[52ch] text-[16px] text-ink-soft">
              Agents that run one after another, each in its own app.
              {meta && meta.total > 0 && ` You have ${plural(meta.total, "workflow")}.`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link to="/hub">
                <Network className="size-4" />
                Browse Agent Hub
              </Link>
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              New workflow
            </Button>
          </div>
        </header>

        {error && (
          <ErrorState title="Your workflows didn't load" description={error} onRetry={() => load(page)} showRetryButton className="mt-16" />
        )}

        {loading && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded-[24px] bg-raised p-2 shadow-[0_0_0_1px_var(--line)]">
                <Skeleton className="h-32 rounded-[18px]" />
                <div className="space-y-2 p-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {empty && (
          <div className="mt-14 flex flex-col items-center text-center">
            <div className="aspect-[1000/160] w-full max-w-[720px]">
              <Garden plants={BORDER.map((p) => ({ ...p, x: 0.15 + p.x * 0.7 }))} height={160} className="h-full w-full" />
            </div>
            <h2 className="mt-6 font-serif text-[26px] tracking-[-0.015em]">Nothing planted yet</h2>
            <p className="mt-2 max-w-[44ch] text-[16px] leading-relaxed text-ink-soft">
              A workflow strings agents together: read the mail, check it, write to the sheet. Start one from scratch, or copy one from Agent Hub.
            </p>
            <div className="mt-6 flex gap-2">
              <Button onClick={() => setDialogOpen(true)} size="lg">
                <Plus className="size-4" />
                New workflow
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/hub">Browse Agent Hub</Link>
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && workflows.length > 0 && (
          <>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <li>
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="group flex h-full min-h-[236px] w-full flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-line-strong text-ink-soft transition-colors hover:border-clay/50 hover:bg-raised hover:text-ink"
                >
                  <span className="flex size-12 items-center justify-center rounded-full bg-clay text-on-clay transition-transform duration-500 ease-[var(--ease-bloom)] group-hover:rotate-90">
                    <Plus className="size-5" />
                  </span>
                  <span className="text-[15px] font-medium">New workflow</span>
                </button>
              </li>
              {workflows.map((wf, i) => (
                <li key={wf._id}>
                  <WorkflowCard wf={wf} index={i + 1} />
                </li>
              ))}
            </ul>

            {meta && meta.pages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pages">
                <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <span className="text-[14px] tabular-nums text-ink-soft">
                  Page {meta.page} of {meta.pages}
                </span>
                <Button variant="outline" size="sm" disabled={meta.page >= meta.pages} onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}>
                  Next
                </Button>
              </nav>
            )}
          </>
        )}
      </div>

      <CreateWorkflowDialog open={dialogOpen} setOpen={setDialogOpen} onCreated={onCreated} />
    </div>
  );
}
