import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, CircleCheck, Copy, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { axiosInstance } from "@/utils";
import { copyText, errorMessage, formatDateTime, plural } from "@/lib/format";
import type { DynamicContent } from "@/lib/chat";
import { humanizeAgentName, resolveService, SERVICES } from "@/lib/services";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Blossom } from "@/components/bloom/Blossom";
import { Flower } from "@/components/bloom/Flowers";
import { Markdown } from "@/components/chat/Markdown";
import { ResponseCards } from "@/components/responses/ResponseCards";

interface StageResponse {
  isDynamic: boolean;
  content: string;
  dynamicContent?: DynamicContent[];
}

export interface WorkflowStage {
  stage: number;
  nodeId: string;
  response: StageResponse;
  service?: string;
  agentName?: string;
}

export interface WorkflowOutput {
  content: string;
  isDynamic: boolean;
  dynamicContent?: DynamicContent[];
  timestamp?: string;
}

export interface WorkflowReviewData {
  workflowId: string;
  executionId: string;
  status: string;
  humanInLoop: boolean;
  output?: WorkflowOutput;
  stages?: WorkflowStage[];
  metadata?: {
    stepName?: string;
    requiresApproval?: boolean;
    approvalMessage?: string;
  };
}

interface WorkflowReviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId?: string;
  executionId?: string;
  reviewData?: WorkflowReviewData;
  stagesData?: WorkflowStage[];
  onApprovalComplete?: () => void;
}

/** One step of a run, on the vine: its agent, what it said, and what it made. */
function StageRow({ stage, last, open, onToggle }: { stage: WorkflowStage; last: boolean; open: boolean; onToggle: () => void }) {
  const svcId = resolveService(stage.service) ?? resolveService(stage.agentName);
  const svc = svcId ? SERVICES[svcId] : null;
  const items = stage.response?.dynamicContent ?? [];
  return (
    <li className="relative pl-12">
      {!last && <span aria-hidden className="absolute top-10 bottom-0 left-[19px] w-[3px] rounded-full bg-leaf" />}
      <span
        className={cn("absolute top-1 left-0 flex size-10 items-center justify-center rounded-full", svc ? svc.bgWash : "bg-paper-2")}
        aria-hidden
      >
        {svcId ? <Flower service={svcId} size={26} bloom /> : <span className="text-[13px] font-semibold text-ink-soft">{stage.stage}</span>}
      </span>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 rounded-2xl py-1.5 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] text-ink-soft">Step {stage.stage}{svc ? `, ${svc.name}` : ""}</span>
          <span className="block truncate text-[15.5px] font-medium text-ink">{humanizeAgentName(stage.agentName) || `Step ${stage.stage}`}</span>
          {items.length > 0 && <span className="block text-[13px] text-ink-faint">{plural(items.length, "result")}</span>}
        </span>
        <ChevronDown className={cn("mt-2 size-4 shrink-0 text-ink-soft transition-transform duration-300", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 pt-2 pb-6 animate-rise-sm">
          {stage.response?.content?.trim() && <Markdown text={stage.response.content} className="text-[15.5px]" />}
          {items.length > 0 && <ResponseCards items={items} />}
        </div>
      )}
      {!open && <div className="pb-5" />}
    </li>
  );
}

function IdChip({ label, value }: { label: string; value: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(value)) toast.success(`${label} copied`);
      }}
      title={`Copy ${label.toLowerCase()}`}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-full bg-paper-2 px-2.5 py-1 text-[12px] text-ink-soft hover:bg-paper-3"
    >
      <span className="shrink-0">{label}</span>
      <span className="truncate text-ink">{value}</span>
      <Copy className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function WorkflowReviewDrawer({
  open,
  onOpenChange,
  workflowId,
  executionId,
  reviewData: externalReviewData,
  stagesData: externalStagesData,
  onApprovalComplete,
}: WorkflowReviewDrawerProps) {
  const [reviewData, setReviewData] = useState<WorkflowReviewData | null>(externalReviewData || null);
  const [stages, setStages] = useState<WorkflowStage[]>(externalStagesData || []);
  const [isLoading, setIsLoading] = useState(false);
  const [deciding, setDeciding] = useState<"approve" | "reject" | null>(null);
  const [decided, setDecided] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const fetchReviewData = useCallback(async () => {
    if (!workflowId || !executionId) return;
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await axiosInstance.get(`/workflow/${workflowId}/execution/${executionId}`);
      const list: WorkflowStage[] = Array.isArray(data.data) ? data.data : data.data?.stages ?? [];
      if (!Array.isArray(data.data)) setReviewData(data.data);
      setStages(list);
      if (list.length) setExpanded({ [list[0].stage]: true });
    } catch (err) {
      setError(errorMessage(err, "This run's details didn't load."));
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, executionId]);

  useEffect(() => {
    if (open) {
      setReviewData(externalReviewData ?? null);
      setStages(externalStagesData ?? []);
      if (externalStagesData?.length) setExpanded({ [externalStagesData[0].stage]: true });
      if (!externalReviewData && !externalStagesData?.length) void fetchReviewData();
    } else {
      setDecided(null);
      setError(null);
      setExpanded({});
    }
  }, [open, externalReviewData, externalStagesData, fetchReviewData]);

  const decide = async (approved: boolean) => {
    if (!reviewData) return;
    try {
      setDeciding(approved ? "approve" : "reject");
      setError(null);
      await axiosInstance.post("/workflow/resume", {
        workflowId: reviewData.workflowId,
        executionId: reviewData.executionId,
        approved,
      });
      setDecided(approved ? "approved" : "rejected");
      toast.success(approved ? "Approved. The workflow is carrying on." : "Rejected. The workflow stopped here.");
      onApprovalComplete?.();
      setTimeout(() => onOpenChange(false), 1400);
    } catch (err) {
      setError(errorMessage(err, approved ? "The approval didn't go through." : "The rejection didn't go through."));
    } finally {
      setDeciding(null);
    }
  };

  const needsReview = Boolean(reviewData?.humanInLoop) && !decided;
  const output = reviewData?.output;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="border-b border-line px-6 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <span className={cn("flex size-11 items-center justify-center rounded-2xl", needsReview ? "bg-lavender-wash" : "bg-sage-wash")}>
              {needsReview ? <Blossom size={26} motion="sway" /> : <Blossom size={26} motion="bloom" />}
            </span>
            <div className="min-w-0">
              <SheetTitle className="font-serif text-[22px] font-medium tracking-[-0.01em]">
                {needsReview ? "Your review is needed" : decided === "rejected" ? "Run stopped" : "Run finished"}
              </SheetTitle>
              <SheetDescription className="text-[14px] text-ink-soft">
                {needsReview
                  ? reviewData?.metadata?.approvalMessage || "Check what the agents produced, then approve to carry on or reject to stop."
                  : stages.length
                    ? `${plural(stages.length, "step")} ran. Open any step to see what its agent did.`
                    : "Here is what the workflow produced."}
              </SheetDescription>
            </div>
          </div>
          {reviewData && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <IdChip label="Run" value={reviewData.executionId} />
              {reviewData.metadata?.stepName && (
                <span className="inline-flex items-center rounded-full bg-lavender-wash px-2.5 py-1 text-[12px] text-lavender-deep">
                  Paused at {reviewData.metadata.stepName}
                </span>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-24 w-full rounded-[20px]" />
              <Skeleton className="h-24 w-full rounded-[20px]" />
            </div>
          )}

          {error && (
            <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl bg-danger-wash px-4 py-3 text-[14px] text-ink">
              <span className="flex-1">{error}</span>
              {!reviewData && (
                <button type="button" onClick={fetchReviewData} className="inline-flex items-center gap-1 font-medium text-danger">
                  <RotateCcw className="size-3.5" /> Retry
                </button>
              )}
            </div>
          )}

          {!isLoading && output && (
            <section className="space-y-4">
              {output.content?.trim() && <Markdown text={output.content} />}
              {output.dynamicContent && output.dynamicContent.length > 0 && <ResponseCards items={output.dynamicContent} />}
              {output.timestamp && <p className="text-[12.5px] text-ink-faint">Produced {formatDateTime(output.timestamp)}</p>}
            </section>
          )}

          {!isLoading && stages.length > 0 && !output && (
            <ol className="relative">
              {stages.map((s, i) => (
                <StageRow
                  key={`${s.stage}-${s.nodeId}`}
                  stage={s}
                  last={i === stages.length - 1}
                  open={Boolean(expanded[s.stage])}
                  onToggle={() => setExpanded((e) => ({ ...e, [s.stage]: !e[s.stage] }))}
                />
              ))}
            </ol>
          )}

          {!isLoading && !output && stages.length === 0 && !error && (
            <p className="pt-10 text-center text-[15px] text-ink-soft">This run didn't send back anything to show.</p>
          )}
        </div>

        {needsReview ? (
          <div className="flex gap-2 border-t border-line bg-paper-2/60 px-6 py-4">
            <Button variant="outline" size="lg" className="flex-1" disabled={deciding !== null} onClick={() => decide(false)}>
              {deciding === "reject" ? <Blossom size={16} motion="loading" /> : <X className="size-4" />}
              Reject
            </Button>
            <Button size="lg" className="flex-1" disabled={deciding !== null} onClick={() => decide(true)}>
              {deciding === "approve" ? <Blossom size={16} motion="loading" /> : <Check className="size-4" />}
              Approve and continue
            </Button>
          </div>
        ) : (
          (stages.length > 0 || output) && (
            <p className="flex items-center justify-center gap-2 border-t border-line px-6 py-3.5 text-[13.5px] text-ink-soft">
              <CircleCheck className="size-4 text-sage-deep" />
              {decided === "approved" ? "Approved" : decided === "rejected" ? "Rejected" : "Finished"}
            </p>
          )
        )}
      </SheetContent>
    </Sheet>
  );
}

export default WorkflowReviewDrawer;
