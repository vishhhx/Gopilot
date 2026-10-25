import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Check,
  Flag,
  GitFork,
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { axiosInstance } from "@/utils";
import { errorMessage, formatTime } from "@/lib/format";
import { humanizeAgentName, SERVICES, type ServiceId } from "@/lib/services";
import { Blossom } from "@/components/bloom/Blossom";
import { PageLoader } from "@/components/bloom/BlossomLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ErrorState from "@/components/Other/common/ErrorState";
import { GenerateWorkflowDialog } from "@/components/workflow/GenerateWorkflowDialog";
import { RunWorkflowDialog } from "@/components/workflow/RunWorkflowDialog";
import { RunPanel } from "@/components/workflow/RunPanel";
import { NodeInspector } from "@/components/workflow/NodeInspector";
import { InputFieldsEditor } from "@/components/workflow/InputFieldsEditor";
import { NodeStatusContext, WorkflowInputsContext, type NodeStatus } from "@/components/workflow/nodeStatus";
import { UploadToHubDialog } from "@/components/workflow/UploadToHubDialog";
import { TONES, type Tone } from "@/components/workflow/nodes/NodeShell";
import { nodeTypes } from "@/components/workflow/nodeTypes";
import { cleanFields, isActive, issuesMessage, workflowApi, type InputField, type PlanIssue, type WorkflowRun } from "@/lib/workflow";
import { AppLogo } from "@/components/bloom/AppLogo";

interface Workflow {
  title?: string;
  updatedAt?: string;
  nodes: Node[];
  edges: Edge[];
  inputs?: InputField[];
}

interface AgentItem {
  name: string;
  description: string;
}

/* The agents the workflow runner knows how to execute, by app (backend: src/workflow/registry.ts). */
const AGENT_GROUPS: { service: ServiceId; svgpath: string; agents: AgentItem[] }[] = [
  {
    service: "gmail",
    svgpath: "/public/icons/Gmail.svg",
    agents: [
      { name: "gmailReaderAgent", description: "Search and read emails" },
      { name: "gmailWriterAgent", description: "Send, reply to and forward emails" },
      { name: "gmailTrashAgent", description: "Trash, archive, label or mark emails as spam" },
      { name: "gmailDeleteAgent", description: "Permanently delete emails" },
    ],
  },
  {
    service: "sheets",
    svgpath: "/public/icons/Sheets.svg",
    agents: [
      { name: "sheetsReaderAgent", description: "Read spreadsheet values and metadata" },
      { name: "sheetsWriterAgent", description: "Write, update or append cell values" },
      { name: "sheetsManagementAgent", description: "Create spreadsheets and manage sheet tabs" },
      { name: "sheetsStructureAgent", description: "Insert or delete rows and columns" },
      { name: "sheetsFormattingAgent", description: "Format cells: colours, fonts, borders" },
      { name: "sheetsHelperAgent", description: "Find rows, the last row, or a sheet by name" },
    ],
  },
  {
    service: "calendar",
    svgpath: "/public/icons/Calendar.svg",
    agents: [
      { name: "calendarReaderAgent", description: "List and read calendar events" },
      { name: "calendarWriterAgent", description: "Create or update calendar events" },
      { name: "calendarDeleteAgent", description: "Delete calendar events" },
    ],
  },
  {
    service: "meet",
    svgpath: "/public/icons/Meet.svg",
    agents: [
      { name: "meetCreatorAgent", description: "Schedule meetings with Meet links" },
      { name: "meetReaderAgent", description: "List and read meetings" },
      { name: "meetEditorAgent", description: "Reschedule meetings and manage guests" },
      { name: "meetDeleteAgent", description: "Cancel or delete meetings" },
    ],
  },
  {
    service: "drive",
    svgpath: "/public/icons/Drive.svg",
    agents: [
      { name: "driveReaderAgent", description: "Find and list Drive files and folders" },
      { name: "driveUploaderAgent", description: "Create folders and upload files" },
      { name: "driveSharerAgent", description: "Share files and folders" },
      { name: "driveDeleteAgent", description: "Delete Drive files and folders" },
    ],
  },
  {
    service: "forms",
    svgpath: "/public/icons/Forms.svg",
    agents: [
      { name: "formCreatorAgent", description: "Create or duplicate Google Forms" },
      { name: "formReaderAgent", description: "Read forms and summarize responses" },
      { name: "formEditorAgent", description: "Edit form questions and settings" },
      { name: "formDeleteAgent", description: "Move forms to the trash" },
    ],
  },
];

// Errors are caught at every step, so there's no separate error node.
const STEPS: { type: "Start" | "Checker" | "HIL" | "End"; label: string; note: string; tone: Tone; icon: ReactNode }[] = [
  { type: "Start", label: "Start", note: "Where every run begins", tone: TONES.start, icon: <Play className="size-4 fill-current" /> },
  { type: "Checker", label: "Checker", note: "Check a result before going on", tone: TONES.checker, icon: <GitFork className="size-4 rotate-180" /> },
  { type: "HIL", label: "Human review", note: "Pause for your approval", tone: TONES.review, icon: <UserRoundCheck className="size-4" /> },
  { type: "End", label: "End", note: "Where the run finishes", tone: TONES.end, icon: <Flag className="size-4" /> },
];

const INSPECTABLE = new Set(["Agent", "Checker", "HIL"]);

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Changes React Flow reports while measuring or selecting; they don't need saving. */
const QUIET = new Set(["dimensions", "select"]);

function PaletteItem({
  icon,
  title,
  note,
  wash,
  onDragStart,
  onAdd,
}: {
  icon: ReactNode;
  title: string;
  note: string;
  wash: string;
  onDragStart: (e: DragEvent) => void;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onAdd}
      title="Drag onto the canvas, or click to add"
      className="group flex w-full cursor-grab items-center gap-3 rounded-2xl px-2 py-2 text-left transition-[background-color,transform] duration-200 hover:bg-raised hover:shadow-float active:cursor-grabbing active:scale-[0.98]"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-500 ease-[var(--ease-bloom)] group-hover:rotate-[14deg]" style={{ background: wash }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-ink">{title}</span>
        <span className="block truncate text-[12.5px] text-ink-soft">{note}</span>
      </span>
      <GripVertical className="size-4 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function FlowContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { screenToFlowPosition } = useReactFlow();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [workflow, setWorkflow] = useState<Workflow>({ nodes: [], edges: [] });
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const dirty = useRef(false);

  const [search, setSearch] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(() => window.matchMedia("(min-width: 768px)").matches);
  const [openGroup, setOpenGroup] = useState<ServiceId | null>("gmail");

  const [inputs, setInputs] = useState<InputField[]>([]);
  const [inputsOpen, setInputsOpen] = useState(false);
  const [draftInputs, setDraftInputs] = useState<InputField[]>([]);

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [issues, setIssues] = useState<PlanIssue[]>([]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    if (changes.some((c) => !QUIET.has(c.type))) dirty.current = true;
    setNodes((ns) => applyNodeChanges(changes, ns));
  }, []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (changes.some((c) => !QUIET.has(c.type))) dirty.current = true;
    setEdges((es) => applyEdgeChanges(changes, es));
  }, []);
  const onConnect = useCallback((params: Connection) => {
    dirty.current = true;
    setEdges((es) => addEdge({ ...params, animated: true }, es));
  }, []);

  const addNode = useCallback((type: string, data: Record<string, unknown>, at?: { x: number; y: number }) => {
    let position = at;
    if (!position) {
      // no drop point: put it in the middle of what's on screen, nudged so repeats don't stack
      const r = canvasRef.current?.getBoundingClientRect();
      const jitter = () => Math.round((Math.random() - 0.5) * 80);
      position = screenToFlowPosition({
        x: (r ? r.left + r.width / 2 : window.innerWidth / 2) + jitter() - 120,
        y: (r ? r.top + r.height / 2 : window.innerHeight / 2) + jitter() - 30,
      });
    }
    dirty.current = true;
    setNodes((ns) => ns.concat({ id: crypto.randomUUID(), type, position, data }));
    if (!window.matchMedia("(min-width: 768px)").matches) setPaletteOpen(false);
  }, [screenToFlowPosition]);

  const onDragStart = (event: DragEvent, nodeType: string, nodeData: Record<string, unknown>) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify({ type: nodeType, data: nodeData }));
    event.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/reactflow");
      if (!raw) return;
      const { type, data } = JSON.parse(raw);
      addNode(type, data, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    },
    [screenToFlowPosition, addNode]
  );

  const getWorkflow = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await axiosInstance.get(`/workflow/${id}`);
      const wf: Workflow = data.data.workflow;
      // Error nodes are no longer needed: every step's errors are caught by the run itself.
      const kept = (wf.nodes || []).filter((n) => n.type !== "Error");
      const keptIds = new Set(kept.map((n) => n.id));
      setWorkflow(wf);
      setNodes(kept);
      setEdges((wf.edges || []).filter((e) => keptIds.has(e.source) && keptIds.has(e.target)));
      setInputs(wf.inputs ?? []);
      if (wf.updatedAt) setSavedAt(new Date(wf.updatedAt));
      dirty.current = kept.length !== (wf.nodes || []).length;
      // pick up a run that is still going or waiting for review, e.g. after a reload
      const latest = await workflowApi.latestRun(id).catch(() => null);
      if (latest && isActive(latest)) {
        setRun(latest);
        if (latest.status === "waiting_for_review") setRunPanelOpen(true);
      }
    } catch (err) {
      setError(errorMessage(err, "This workflow didn't load."));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    getWorkflow();
  }, [getWorkflow]);

  const saveWorkflow = useCallback(async () => {
    if (!id) return false;
    setSaveStatus("saving");
    try {
      const ids = new Set(nodes.map((n) => n.id));
      const payload = {
        nodes: nodes.map((n) => ({ ...n, measured: n.measured || null, selected: false, dragging: false })),
        edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
        inputs,
      };
      await axiosInstance.patch(`/workflow/${id}/nodes-edges`, payload);
      dirty.current = false;
      setSavedAt(new Date());
      setSaveStatus("saved");
      return true;
    } catch {
      setSaveStatus("error");
      return false;
    }
  }, [id, nodes, edges, inputs]);

  // save a moment after the last change
  useEffect(() => {
    if (isLoading || !dirty.current) return;
    const t = setTimeout(() => void saveWorkflow(), 2000);
    return () => clearTimeout(t);
  }, [nodes, edges, inputs, isLoading, saveWorkflow]);

  const saveRef = useRef(saveWorkflow);
  saveRef.current = saveWorkflow;

  /** Saves the canvas, then asks the server what would run, marking problem nodes. */
  const prepareRun = useCallback(async () => {
    if (!id) throw new Error("This workflow isn't saved yet.");
    if (!(await saveRef.current())) throw new Error("The workflow couldn't be saved. Try again.");
    const plan = await workflowApi.check(id);
    setIssues([...plan.errors, ...plan.warnings]);
    return plan;
  }, [id]);

  // follow the active run until it pauses or ends
  const runId = run?.id;
  const runStatus = run?.status;
  useEffect(() => {
    if (!runId || runStatus !== "running") return;
    const t = setInterval(async () => {
      try {
        const next = await workflowApi.getRun(runId);
        setRun(next);
        if (next.status === "waiting_for_review") {
          setRunPanelOpen(true);
          toast("The workflow is waiting for you", { description: "Review the results to let it carry on." });
        } else if (next.status === "completed") toast.success("The workflow finished");
        else if (next.status === "failed") toast.error("The workflow stopped", { description: next.error ?? undefined });
      } catch {
        /* keep polling; a dropped request shouldn't end the view */
      }
    }, 1500);
    return () => clearInterval(t);
  }, [runId, runStatus]);

  const reviewRun = async (approved: boolean, note: string) => {
    if (!run) return;
    try {
      setRun(await workflowApi.review(run.id, approved, note));
      toast.success(approved ? "Carrying on" : "Run stopped");
    } catch (err) {
      toast.error("That didn't go through", { description: issuesMessage(err, "Try again.") });
    }
  };

  const nodeStatus = useMemo(() => {
    const map: Record<string, NodeStatus> = {};
    for (const issue of issues) if (issue.nodeId) map[issue.nodeId] = { issue: issue.message };
    for (const step of run?.steps ?? []) map[step.nodeId] = { ...map[step.nodeId], run: step.status };
    return map;
  }, [issues, run]);

  const selected = nodes.filter((n) => n.selected);
  const inspected = selected.length === 1 && INSPECTABLE.has(selected[0].type ?? "") ? selected[0] : null;
  const updateNodeData = useCallback((nodeId: string, patch: Record<string, unknown>) => {
    dirty.current = true;
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void saveWorkflow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveWorkflow]);

  const handleGenerated = (wf: { nodes?: Node[]; edges?: Edge[]; inputs?: InputField[] }) => {
    dirty.current = true;
    setNodes(wf?.nodes ?? []);
    setEdges(wf?.edges ?? []);
    if (wf?.inputs) setInputs(wf.inputs);
    setIssues([]);
  };

  const q = search.trim().toLowerCase();
  const groups = useMemo(
    () =>
      AGENT_GROUPS.map((g) => ({
        ...g,
        agents: q
          ? g.agents.filter(
              (a) =>
                a.name.toLowerCase().includes(q) ||
                a.description.toLowerCase().includes(q) ||
                SERVICES[g.service].name.toLowerCase().includes(q)
            )
          : g.agents,
      })).filter((g) => g.agents.length > 0),
    [q]
  );
  const steps = STEPS.filter((s) => !q || s.label.toLowerCase().includes(q) || s.note.toLowerCase().includes(q));

  if (isLoading) return <PageLoader label="Opening the workflow" />;
  if (error)
    return (
      <ErrorState
        title="This workflow didn't open"
        description={error}
        onRetry={getWorkflow}
        showRetryButton
        fullHeight
        centered
      />
    );

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-line px-2 sm:gap-2 sm:px-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back to workflows">
          <Link to="/workflow">
            <ArrowLeft className="size-[18px]" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPaletteOpen((o) => !o)}
          aria-label={paletteOpen ? "Hide the node list" : "Show the node list"}
          aria-expanded={paletteOpen}
        >
          {paletteOpen ? <PanelLeftClose className="size-[18px]" /> : <PanelLeftOpen className="size-[18px]" />}
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-3 pl-1">
          <h1 className="truncate font-serif text-[17px] font-medium tracking-[-0.01em]">{workflow?.title || "Untitled workflow"}</h1>
          <SaveChip status={saveStatus} savedAt={savedAt} onRetry={saveWorkflow} />
        </div>
        <Button variant="ghost" onClick={() => setAssistantOpen(true)} className="hidden sm:inline-flex">
          <Blossom size={18} className="petal-hover" />
          Build with AI
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setAssistantOpen(true)} className="sm:hidden" aria-label="Build with AI">
          <Blossom size={18} />
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setDraftInputs(inputs);
            setInputsOpen(true);
          }}
          className="hidden sm:inline-flex"
        >
          <SlidersHorizontal className="size-4" />
          Inputs{inputs.length ? ` (${inputs.length})` : ""}
        </Button>
        <Button variant="ghost" onClick={() => setUploadOpen(true)} className="hidden md:inline-flex">
          <Share2 className="size-4" />
          Share to Hub
        </Button>
        {run && isActive(run) ? (
          <Button onClick={() => setRunPanelOpen(true)} variant={run.status === "waiting_for_review" ? "default" : "outline"}>
            {run.status === "running" ? <Blossom size={16} motion="loading" /> : <UserRoundCheck className="size-4" />}
            {run.status === "running"
              ? `Step ${Math.min(run.currentStep + 1, run.steps.length)} of ${run.steps.length}`
              : "Review needed"}
          </Button>
        ) : (
          <>
            {run && (
              <Button variant="ghost" onClick={() => setRunPanelOpen(true)} className="hidden sm:inline-flex">
                Last run
              </Button>
            )}
            <Button onClick={() => setRunOpen(true)}>
              <Play className="size-3.5 fill-current" />
              Run
            </Button>
          </>
        )}
      </header>

      <div className="relative flex min-h-0 flex-1">
        {paletteOpen && (
          <aside
            className="absolute inset-y-0 left-0 z-20 flex w-[300px] max-w-[86vw] flex-col border-r border-line bg-paper shadow-float animate-[rise-sm_280ms_var(--ease-soft)_both] md:relative md:shadow-none"
            aria-label="Nodes"
          >
            <div className="p-3">
              <label className="relative block">
                <span className="sr-only">Search nodes</span>
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents and steps" className="h-10 rounded-full bg-paper-2 pl-9" />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              <h2 className="px-2 pt-1 pb-2 text-[13px] font-medium text-ink-soft">Agents</h2>
              <ul className="space-y-1">
                {groups.map((g) => {
                  const svc = SERVICES[g.service];
                  const open = q !== "" || openGroup === g.service;
                  return (
                    <li key={g.service} className={cn("rounded-[20px] transition-colors duration-300", open && svc.bgWash)}>
                      <button
                        type="button"
                        onClick={() => setOpenGroup(open && !q ? null : g.service)}
                        aria-expanded={open}
                        className="flex w-full items-center gap-3 rounded-[20px] px-2 py-2 text-left hover:bg-paper-2/60"
                      >
                        <AppLogo service={g.service} size={26} className={cn("transition-transform duration-500 ease-[var(--ease-bloom)]", open && "scale-110")} />
                        <span className="flex-1 text-[14.5px] font-medium">{svc.name}</span>
                        <span className={cn("text-[12.5px] tabular-nums", open ? svc.textDeep : "text-ink-faint")}>{g.agents.length}</span>
                      </button>
                      {open && (
                        <div className="space-y-0.5 px-1 pb-2 animate-rise-sm">
                          {g.agents.map((a) => {
                            const data = { service: g.service, svgpath: g.svgpath, ...a };
                            return (
                              <PaletteItem
                                key={a.name}
                                wash="var(--raised)"
                                icon={<AppLogo service={g.service} size={20} />}
                                title={humanizeAgentName(a.name)}
                                note={a.description}
                                onDragStart={(e) => onDragStart(e, "Agent", data)}
                                onAdd={() => addNode("Agent", data)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {steps.length > 0 && (
                <>
                  <h2 className="px-2 pt-5 pb-2 text-[13px] font-medium text-ink-soft">Steps</h2>
                  <div className="space-y-0.5">
                    {steps.map((s) => (
                      <PaletteItem
                        key={s.type}
                        wash={s.tone.wash}
                        icon={<span style={{ color: s.tone.deep }}>{s.icon}</span>}
                        title={s.label}
                        note={s.note}
                        onDragStart={(e) => onDragStart(e, s.type, {})}
                        onAdd={() => addNode(s.type, {})}
                      />
                    ))}
                  </div>
                </>
              )}
              {groups.length === 0 && steps.length === 0 && (
                <p className="px-2 pt-6 text-center text-[14px] text-ink-soft">Nothing matches "{search}".</p>
              )}
            </div>
            <p className="border-t border-line px-5 py-3 text-[12.5px] leading-relaxed text-ink-faint">
              Drag onto the canvas or click to add. Backspace removes what's selected. Changes save on their own.
            </p>
          </aside>
        )}

        <main ref={canvasRef} className="relative min-w-0 flex-1" onClick={() => paletteOpen && window.innerWidth < 768 && setPaletteOpen(false)}>
          <WorkflowInputsContext.Provider value={inputs}>
          <NodeStatusContext.Provider value={nodeStatus}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            deleteKeyCode={["Backspace", "Delete"]}
            defaultEdgeOptions={{ type: "smoothstep", animated: true }}
            fitView
            fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
            minZoom={0.2}
            attributionPosition="bottom-right"
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.6} color="var(--line-strong)" />
            <Controls position="bottom-left" showInteractive={false} />
          </ReactFlow>
          </NodeStatusContext.Provider>
          </WorkflowInputsContext.Provider>

          {inspected && (
            <NodeInspector
              key={inspected.id}
              node={inspected}
              inputs={inputs}
              onChange={updateNodeData}
              onClose={() => setNodes((ns) => ns.map((n) => (n.selected ? { ...n, selected: false } : n)))}
              onManageInputs={() => {
                setDraftInputs(inputs);
                setInputsOpen(true);
              }}
              onCreateInput={(field) => {
                dirty.current = true;
                setInputs((list) => (list.some((f) => f.key === field.key) ? list : [...list, field]));
              }}
            />
          )}

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <div className="pointer-events-auto max-w-sm text-center animate-rise">
                <Blossom size={64} motion="bloom" className="mx-auto animate-sway [animation-delay:900ms]" />
                <h2 className="mt-5 font-serif text-[24px] tracking-[-0.01em]">An empty bed</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                  Add a Start node and some agents from the list, or describe the job and let GoPilot plant the nodes for you.
                </p>
                <div className="mt-5 flex justify-center gap-2">
                  <Button onClick={() => setAssistantOpen(true)}>
                    <Blossom size={16} />
                    Build with AI
                  </Button>
                  <Button variant="outline" onClick={() => addNode("Start", {})}>
                    Add a Start node
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <GenerateWorkflowDialog onCreated={handleGenerated} open={assistantOpen} setOpen={setAssistantOpen} />
      <RunWorkflowDialog
        open={runOpen}
        setOpen={setRunOpen}
        workflowId={id}
        inputs={inputs}
        prepare={prepareRun}
        onStarted={(started) => {
          setRun(started);
          setRunPanelOpen(true);
        }}
      />
      <RunPanel
        open={runPanelOpen}
        onOpenChange={setRunPanelOpen}
        run={run}
        onReview={reviewRun}
        onRunAgain={() => {
          setRunPanelOpen(false);
          setRunOpen(true);
        }}
      />
      <Dialog open={inputsOpen} onOpenChange={setInputsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Inputs for each run</DialogTitle>
            <DialogDescription>The Run dialog asks for these each time. Click a step and use "Insert an input" to put one in its task.</DialogDescription>
          </DialogHeader>
          <InputFieldsEditor fields={draftInputs} onChange={setDraftInputs} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInputsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                dirty.current = true;
                setInputs(cleanFields(draftInputs));
                setInputsOpen(false);
              }}
            >
              Save inputs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UploadToHubDialog
        open={uploadOpen}
        setOpen={setUploadOpen}
        title={workflow?.title || ""}
        nodes={nodes}
        edges={edges}
        onUploaded={() => navigate("/hub")}
      />
    </div>
  );
}

function SaveChip({ status, savedAt, onRetry }: { status: SaveStatus; savedAt: Date | null; onRetry: () => void }) {
  if (status === "error")
    return (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-danger-wash px-2.5 text-[12.5px] font-medium text-danger"
      >
        <RotateCcw className="size-3.5" />
        Not saved. Try again
      </button>
    );
  return (
    <span className="hidden shrink-0 items-center gap-1.5 text-[12.5px] text-ink-faint sm:inline-flex" role="status">
      {status === "saving" ? (
        <>
          <Blossom size={14} motion="loading" />
          Saving
        </>
      ) : savedAt ? (
        <>
          <Check className={cn("size-3.5", status === "saved" ? "text-sage-deep animate-bloom" : "")} />
          Saved {formatTime(savedAt)}
        </>
      ) : null}
    </span>
  );
}

export default function Flow() {
  return (
    <ReactFlowProvider>
      <FlowContent />
    </ReactFlowProvider>
  );
}
