import { useEffect, useState } from "react";
import { axiosInstance } from "@/utils";
import { ArrowUpRightIcon, WorkflowIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  WorkflowCard,
  type Workflow,
} from "@/components/workflow/WorkflowCard";
import { CreateWorkflowDialog } from "@/components/workflow/CreateWorkflowDialog";

export default function WorkFlowPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [meta, setMeta] = useState<{
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get("/workflow", {
        params: { page: p, pageSize },
      });
      if (data && data.data) {
        setWorkflows(data.data.workflows || []);
        setMeta(data.data.meta || null);
      } else {
        setWorkflows([]);
        setMeta(null);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load workflows"
      );
      setWorkflows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
  }, [page]);

  const onCreated = (wf: Workflow) => {
    setWorkflows((prev) => [wf, ...prev]);
    setMeta((m) => (m ? { ...m, total: m.total + 1 } : m));
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading workflows...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="text-destructive mb-4">{error}</div>
        <div className="flex gap-2">
          <Button onClick={() => load(page)}>Retry</Button>
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            Create Workflow
          </Button>
        </div>
        <CreateWorkflowDialog
          open={dialogOpen}
          setOpen={setDialogOpen}
          onCreated={onCreated}
        />
      </div>
    );
  }

  if (!workflows || workflows.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Empty className="w-full max-w-md">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WorkflowIcon />
            </EmptyMedia>
            <EmptyTitle>No Workflow Yet</EmptyTitle>
            <EmptyDescription>
              You haven't created any Workflow yet. Get started by creating your
              first Workflow.
            </EmptyDescription>
          </EmptyHeader>

          <EmptyContent>
            <div className="flex gap-2">
              <Button onClick={() => setDialogOpen(true)}>
                Create Workflow
              </Button>
              <Button variant="outline">Import Workflow</Button>
            </div>
          </EmptyContent>

          <div className="mt-4">
            <Button
              variant="link"
              asChild
              size="sm"
              className="text-muted-foreground"
            >
              <a href="#">
                Learn More <ArrowUpRightIcon />
              </a>
            </Button>
          </div>
        </Empty>

        <CreateWorkflowDialog
          open={dialogOpen}
          setOpen={setDialogOpen}
          onCreated={onCreated}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-[40%] border-b  p-6 flex flex-col">
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-1">Workflows</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage your automation workflows
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={() => setDialogOpen(true)}
                className="min-w-[200px] h-12"
              >
                <WorkflowIcon className="w-5 h-5 mr-2" />
                Create Workflow
              </Button>
              <p className="text-xs text-muted-foreground">
                Build from scratch
              </p>
            </div>

            <div className="text-muted-foreground hidden sm:block text-sm">
              or
            </div>

            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                variant="outline"
                className="min-w-[200px] h-12"
              >
                <ArrowUpRightIcon className="w-5 h-5 mr-2" />
                Import Workflow
              </Button>
              <p className="text-xs text-muted-foreground">
                Use existing template
              </p>
            </div>
          </div>
        </div>

        
      </div>

      {/* Bottom Section - Workflow List (65% height) */}
      <div className="h-[60%] flex flex-col">
        <div className="px-6 py-4  flex items-center justify-between bg-background/95">
          <div>
            <h3 className="font-semibold text-lg">Your Workflows</h3>
            {meta && (
              <div className="text-xs text-muted-foreground">
                Page {meta.page} of {meta.pages}
              </div>
            )}
          </div>

          {meta && meta.pages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={meta.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground px-3 min-w-[60px] text-center">
                {meta.page} / {meta.pages}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={meta.page >= meta.pages}
                onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {workflows.map((wf) => (
                <WorkflowCard key={wf._id} wf={wf} />
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      <CreateWorkflowDialog
        open={dialogOpen}
        setOpen={setDialogOpen}
        onCreated={onCreated}
      />
    </div>
  );
}
