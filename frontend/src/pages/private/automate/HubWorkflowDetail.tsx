import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Background, BackgroundVariant, Controls, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { axiosInstance } from "@/utils";
import { copyText, errorMessage, formatDate, plural } from "@/lib/format";
import { servicesInNodes, SERVICES } from "@/lib/services";
import { copyHubWorkflow, type HubWorkflow } from "@/lib/hub";
import { Button } from "@/components/ui/button";
import { Blossom } from "@/components/bloom/Blossom";
import { PageLoader } from "@/components/bloom/BlossomLoader";
import { PersonBadge } from "@/components/responses/shared";
import ErrorState from "@/components/Other/common/ErrorState";
import { nodeTypes } from "@/components/workflow/nodeTypes";
import { AppLogo } from "@/components/bloom/AppLogo";

function WorkflowDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<HubWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const fetchWorkflow = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const { data } = await axiosInstance.get(`/hub/hub/${id}`);
      setWorkflow(data?.data || data);
    } catch (err) {
      setError(errorMessage(err, "This workflow didn't load."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchWorkflow();
  }, [fetchWorkflow]);

  const copy = async () => {
    if (!id) return;
    try {
      setCopying(true);
      const newId = await copyHubWorkflow(id);
      toast.success("Copied to your workflows");
      navigate(newId ? `/workflow/${newId}` : "/workflow");
    } catch (err) {
      toast.error("The workflow wasn't copied", { description: errorMessage(err, "Try again in a moment.") });
    } finally {
      setCopying(false);
    }
  };

  const shareLink = async () => {
    if (await copyText(window.location.href)) toast.success("Link copied");
    else toast.error("Couldn't copy the link");
  };

  if (loading) return <PageLoader label="Opening the workflow" />;
  if (error || !workflow)
    return (
      <ErrorState
        type={error ? "default" : "notFound"}
        title={error ? "This workflow didn't load" : "Workflow not found"}
        description={error ?? "It may have been removed from Agent Hub."}
        onRetry={error ? fetchWorkflow : undefined}
        fullHeight
      >
        <Button asChild variant="ghost" className="mt-3">
          <Link to="/hub">Back to Agent Hub</Link>
        </Button>
      </ErrorState>
    );

  const used = servicesInNodes(workflow.nodes);

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-2 sm:px-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back to Agent Hub">
          <Link to="/hub">
            <ArrowLeft className="size-[18px]" />
          </Link>
        </Button>
        <h1 className="min-w-0 flex-1 truncate font-serif text-[17px] font-medium tracking-[-0.01em]">{workflow.title || "Untitled workflow"}</h1>
        <Button variant="ghost" onClick={shareLink} className="hidden sm:inline-flex">
          <Link2 className="size-4" />
          Copy link
        </Button>
        <Button onClick={copy} disabled={copying}>
          {copying ? <Blossom size={16} motion="loading" /> : <Copy className="size-4" />}
          {copying ? "Copying" : "Copy to my workflows"}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 overflow-y-auto border-line p-6 lg:w-[360px] lg:border-r">
          <div className="flex items-center gap-4 animate-rise-sm">
            <Blossom size={64} active={used.length ? used : []} motion="bloom" />
            <div className="text-[14px] text-ink-soft">
              <p>{plural(workflow.nodes.length, "node")}</p>
              <p>{plural(workflow.edges.length, "connection")}</p>
            </div>
          </div>

          <p className="mt-6 text-[16px] leading-relaxed text-ink">{workflow.description || "No description."}</p>

          {used.length > 0 && (
            <section className="mt-7">
              <h2 className="text-[13px] font-medium text-ink-soft">Works in</h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {used.map((s) => (
                  <li key={s} className={`inline-flex h-8 items-center gap-1.5 rounded-full pr-3 pl-1.5 text-[13.5px] ${SERVICES[s].bgWash} ${SERVICES[s].textDeep}`}>
                    <AppLogo service={s} size={20} bloom />
                    {SERVICES[s].name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {workflow.promts && workflow.promts.length > 0 && (
            <section className="mt-7">
              <h2 className="text-[13px] font-medium text-ink-soft">Try it with</h2>
              <ul className="mt-2 space-y-1.5">
                {workflow.promts.map((p) => (
                  <li key={p} className="rounded-2xl bg-lavender-wash px-3.5 py-2.5 text-[14px] text-ink">
                    "{p}"
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-7 flex items-center gap-3 rounded-2xl bg-paper-2 p-3.5">
            <PersonBadge name={workflow.uploader?.name} email={workflow.uploader?.email} size={36} />
            <div className="min-w-0 text-[14px] leading-tight">
              <p className="truncate font-medium">Shared by {workflow.uploader?.name || "someone"}</p>
              <p className="mt-0.5 text-[13px] text-ink-soft">
                {formatDate(workflow.createdAt)}
                {workflow.updatedAt !== workflow.createdAt && `, updated ${formatDate(workflow.updatedAt)}`}
              </p>
            </div>
          </section>
        </aside>

        <main className="relative min-h-[420px] flex-1">
          <ReactFlow
            nodes={workflow.nodes}
            edges={workflow.edges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView
            fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
            minZoom={0.2}
            attributionPosition="bottom-right"
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.6} color="var(--line-strong)" />
            <Controls position="bottom-left" showInteractive={false} />
          </ReactFlow>
          <p className="pointer-events-none absolute top-3 right-4 rounded-full bg-raised/90 px-3 py-1 text-[12.5px] text-ink-soft shadow-float">
            Preview. Copy it to make changes.
          </p>
        </main>
      </div>
    </div>
  );
}

export default function HubWorkflowDetail() {
  return (
    <ReactFlowProvider>
      <WorkflowDetailContent />
    </ReactFlowProvider>
  );
}
