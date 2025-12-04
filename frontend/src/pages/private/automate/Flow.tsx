import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import AgentNode from "@/components/workflow/nodes/AgentNode";
import CheckerNode from "@/components/workflow/nodes/CheckerNode";
import ErrorHandlerNode from "@/components/workflow/nodes/ErrorHandlerNode";
import HumanInLoopNode from "@/components/workflow/nodes/HumanInLoopNode";
import StartNode from "@/components/workflow/nodes/StartNode";
import EndNode from "@/components/workflow/nodes/EndNode";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Bot,
  GripVertical,
  Cpu,
  Zap,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  UserCog,
  Square,
  Clock,
  Play,
  MoreVertical,
  SaveIcon,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { axiosInstance } from "@/utils";
import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ============= TYPES =============
interface Workflow {
  title?: string;
  updatedAt?: string;
  nodes: Node[];
  edges: Edge[];
}

type AgentDetail = {
  name: string;
  description: string;
};

type ServiceItem = {
  type: "Agent";
  service: string;
  name: string;
  svgpath?: string;
  agents: AgentDetail[];
};

type OtherItem = {
  type: "Checker" | "Error" | "HIL" | "Start" | "End";
  data: Record<string, any>;
  description?: string;
};

type Category = {
  id?: string;
  name: string;
  items: (ServiceItem | OtherItem)[];
};

type SaveStatus = "idle" | "saving" | "success" | "error";

// ============= DATA =============
const data: Category[] = [
  {
    name: "agents",
    id: "agents",
    items: [
      {
        type: "Agent",
        service: "gmail",
        name: "gmail-agents",
        svgpath: "/public/icons/Gmail.svg",
        agents: [
          { name: "gmailReaderAgent", description: "Read emails" },
          { name: "gmailWriterAgent", description: "Send emails" },
          { name: "gmailDeleteAgent", description: "Delete emails" },
          { name: "gmailTrashAgent", description: "Move emails to trash" },
        ],
      },
      {
        type: "Agent",
        service: "sheets",
        name: "sheets-agents",
        svgpath: "/public/icons/Sheets.svg",
        agents: [
          {
            name: "sheetsReaderAgent",
            description: "Read Google Sheets content",
          },
          {
            name: "sheetsWriterAgent",
            description: "Write values into Sheets",
          },
          {
            name: "sheetsFormattingAgent",
            description: "Apply formatting to Sheets",
          },
          {
            name: "sheetsHelperAgent",
            description: "Provide helper functions for Sheets",
          },
          {
            name: "sheetsManagementAgent",
            description: "Manage sheet tabs and structure",
          },
          {
            name: "sheetsStructureAgent",
            description: "Modify rows, columns and layout",
          },
        ],
      },
    ],
  },
  {
    id: "Logic",
    name: "others",
    items: [
      { type: "Start", data: {}, description: "Start point" },
      { type: "Checker", data: {}, description: "Conditional logic" },
      { type: "Error", data: {}, description: "Error handling" },
      { type: "HIL", data: {}, description: "Human approval" },
      { type: "End", data: {}, description: "End point" },
    ],
  },
];

// ============= COMPONENTS =============
const ServiceIcon = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => {
  const containerStyle =
    "flex items-center justify-center w-8 h-8 rounded-lg border shadow-sm shrink-0 transition-all duration-200";

  if (name.includes("gmail")) {
    return (
      <div
        className={`${containerStyle} bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900/50 ${className}`}
      >
        <img
          src="http://localhost:5000/public/icons/Gmail.svg"
          alt="Gmail"
          className="w-5 h-5 object-contain"
        />
      </div>
    );
  }

  if (name.includes("sheets")) {
    return (
      <div
        className={`${containerStyle} bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/50 ${className}`}
      >
        <img
          src="http://localhost:5000/public/icons/Sheets.svg"
          alt="Sheets"
          className="w-5 h-5 object-contain"
        />
      </div>
    );
  }

  const iconMap: Record<string, React.ReactNode> = {
    Checker: <CheckCircle2 className="w-5 h-5 text-blue-500" />,
    Error: <AlertTriangle className="w-5 h-5 text-orange-500" />,
    HIL: <UserCog className="w-5 h-5 text-purple-500" />,
    End: <Square className="w-5 h-5 text-red-500" />,
  };

  return (
    <div
      className={`${containerStyle} bg-background border-border/50 text-muted-foreground ${className}`}
    >
      {iconMap[name] || <Zap className="w-4 h-4" />}
    </div>
  );
};

const nodeTypes = {
  Start: StartNode,
  Agent: AgentNode,
  Checker: CheckerNode,
  Error: ErrorHandlerNode,
  HIL: HumanInLoopNode,
  End: EndNode,
};

// ============= MAIN COMPONENT =============
function FlowContent() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { id } = useParams();
  const { screenToFlowPosition } = useReactFlow();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [workflow, setWorkflow] = useState<Workflow>({
    nodes: [],
    edges: [],
  });
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // React Flow callbacks
  const onNodesChange = useCallback(
    (changes: any) => setNodes((ns) => applyNodeChanges(changes, ns)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((es) => applyEdgeChanges(changes, es)),
    []
  );
  const onConnect = useCallback((params: any) => {
    console.log("onConnect params:", params);
    // params should include: source, sourceHandle, target, targetHandle
    setEdges((es) => addEdge({ ...params, animated: true }, es));
  }, []);

  // Drag and Drop
  const onDragStart = (
    event: React.DragEvent,
    nodeType: string,
    nodeData: Record<string, any>
  ) => {
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({ type: nodeType, data: nodeData })
    );
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);
  console.log(nodes, "Npdes");
  console.log(edges, "Edges");

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const typeData = event.dataTransfer.getData("application/reactflow");

      if (typeof typeData === "undefined" || !typeData) {
        return;
      }

      const { type, data } = JSON.parse(typeData);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: crypto.randomUUID(),
        type,
        position,
        data: data,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition]
  );

  // Load workflow
  const getWorkflow = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);
      const { data } = await axiosInstance.get(`/workflow/${id}`);
      const workflowData = data.data.workflow;
      setWorkflow(workflowData);
      setNodes(workflowData.nodes || []);
      setEdges(workflowData.edges || []);
    } catch (err) {
      setError("Failed to load workflow");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    getWorkflow();
  }, [getWorkflow]);

  // Save workflow
  const saveWorkflow = useCallback(async () => {
    if (!id) return;

    setSaveStatus("saving");
    try {
      const nodeIds = new Set(nodes.map((n) => n.id));
      const validEdges = edges.filter(
        (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );

      // Remove any undefined/null values from node data
      const cleanNodes = nodes.map((node) => ({
        ...node,
        measured: node.measured || null,
        selected: false, // Reset selection state
        dragging: false, // Reset dragging state
      }));

      const payload = { nodes: cleanNodes, edges: validEdges };
      await axiosInstance.patch(`/workflow/${id}/nodes-edges`, payload);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("saveWorkflow error", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [id, nodes, edges]);

  // Auto-save (debounced)
  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (nodes.length > 0 || edges.length > 0) {
        void saveWorkflow();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [nodes, edges, isLoading, saveWorkflow]);

  // Delete node/edge helper
  const getSelectedNodeOrEdgeId = useCallback(() => {
    const selectedNode = nodes.find((node) => node.selected === true);
    if (selectedNode) {
      return { id: selectedNode.id, from: "nodes" as const };
    }
    const selectedEdge = edges.find((edge) => edge.selected === true);
    if (selectedEdge) {
      return { id: selectedEdge.id, from: "edges" as const };
    }
    return null;
  }, [nodes, edges]);

  const deleteItem = useCallback((id: string, from: "nodes" | "edges") => {
    if (from === "nodes") {
      setNodes((prev) => prev.filter((node) => node.id !== id));
    } else {
      setEdges((prev) => prev.filter((edge) => edge.id !== id));
    }
  }, []);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Delete key
      if (e.key === "Delete") {
        e.preventDefault();
        const data = getSelectedNodeOrEdgeId();
        if (data) {
          deleteItem(data.id, data.from);
        }
        return;
      }

      // Save shortcut (Ctrl+S or Cmd+S)
      if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void saveWorkflow();
      }
    },
    [getSelectedNodeOrEdgeId, deleteItem, saveWorkflow]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Filtered categories (memoized)
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return data;

    return data
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          if ("agents" in item) {
            return (
              item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.agents.some((a) =>
                a.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
            );
          }
          return item.type.toLowerCase().includes(searchQuery.toLowerCase());
        }),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  // Format last updated
  const lastUpdated = useMemo(() => {
    if (
      workflow.updatedAt &&
      !Number.isNaN(new Date(workflow.updatedAt).valueOf())
    ) {
      return new Date(workflow.updatedAt).toLocaleString();
    }
    return "-";
  }, [workflow.updatedAt]);

  // Save button content
  const getSaveButtonContent = () => {
    switch (saveStatus) {
      case "saving":
        return (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            Saving...
          </>
        );
      case "success":
        return (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            Saved
          </>
        );
      case "error":
        return (
          <>
            <XCircle className="h-4 w-4 text-red-500" />
            Error
          </>
        );
      default:
        return (
          <>
            <SaveIcon className="h-4 w-4" />
            Save
          </>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center">
          <svg
            className="h-8 w-8 animate-spin mx-auto mb-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <p className="text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center">
          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 font-medium">{error}</p>
          <Button onClick={getWorkflow} variant="outline" className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background text-foreground overflow-hidden relative pt-14">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-card border-b flex items-center px-4 justify-between z-[99] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <p className="text-lg font-semibold truncate max-w-[300px]">
            {workflow?.title || "Untitled Workflow"}
          </p>
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-xs font-normal px-2 py-0.5"
          >
            <Clock className="h-3 w-3" />
            {lastUpdated}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={saveWorkflow}
            disabled={saveStatus === "saving"}
            aria-label="Save workflow (Ctrl+S)"
          >
            {getSaveButtonContent()}
          </Button>

          <Button className="gap-2">
            <Play className="h-4 w-4" />
            Run
          </Button>

          <Separator orientation="vertical" className="mx-2 h-6" />

          <Button variant="ghost" size="icon" aria-label="More options">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-[380px] h-full flex flex-col border-r bg-card/50 backdrop-blur-xl z-10 shadow-xl shadow-black/5">
        <div className="p-5 border-b space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Cpu className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg tracking-tight">
                Workflow Builder
              </h2>
              <p className="text-xs text-muted-foreground">
                Drag nodes to canvas
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search components..."
              className="pl-9 bg-muted/30 border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary/30 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search components"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="flex flex-col gap-6">
            {filteredCategories.map((category) => (
              <div key={category.id || category.name} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  {category.name === "agents" ? (
                    <Bot className="w-4 h-4 text-primary" />
                  ) : (
                    <LayoutGrid className="w-4 h-4 text-primary" />
                  )}
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {category.name}
                  </h3>
                </div>

                {category.name === "agents" ? (
                  <Accordion
                    type="single"
                    collapsible
                    className="w-full space-y-2"
                  >
                    {(category.items as ServiceItem[]).map((item, idx) => (
                      <AccordionItem
                        key={idx}
                        value={item.name}
                        className="border rounded-xl bg-background shadow-sm data-[state=open]:border-primary/20 transition-all duration-200"
                      >
                        <AccordionTrigger className="px-3 py-3 hover:no-underline hover:bg-muted/50 rounded-xl transition-colors">
                          <div className="flex items-center gap-3">
                            <ServiceIcon name={item.service} />
                            <div className="text-left">
                              <p className="text-sm font-medium leading-none">
                                {item.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-1 font-normal">
                                {item.agents.length} tools
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="pb-3 pt-1 px-3">
                          <div className="grid gap-2 pl-2 border-l-2 border-muted ml-4 mt-2">
                            {item.agents.map((agent, aIdx) => (
                              <div
                                key={aIdx}
                                draggable
                                onDragStart={(event) =>
                                  onDragStart(event, "Agent", {
                                    service: item.service,
                                    svgpath: item.svgpath,
                                    ...agent,
                                  })
                                }
                                className="group relative flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-transparent hover:border-primary/10 hover:bg-white dark:hover:bg-muted hover:shadow-sm cursor-grab active:cursor-grabbing transition-all duration-200"
                              >
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-medium text-foreground/90 group-hover:text-primary transition-colors">
                                    {agent.name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                                    {agent.description}
                                  </span>
                                </div>
                                <GripVertical className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="grid gap-3">
                    {(category.items as OtherItem[]).map((item, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(event) =>
                          onDragStart(event, item.type, item.data)
                        }
                        className="group flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-primary/30 hover:shadow-md cursor-grab active:cursor-grabbing transition-all duration-300"
                      >
                        <ServiceIcon
                          name={item.type}
                          className="bg-background"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium group-hover:text-primary transition-colors">
                            {item.type} Node
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {item.description}
                          </span>
                        </div>
                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Canvas */}
      <main
        className="flex-1 h-full relative bg-muted/5"
        ref={reactFlowWrapper}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
          attributionPosition="bottom-right"
        >
          <Background gap={20} size={1} className="opacity-40" />
          <Controls className="bg-white dark:bg-black border-border shadow-xl rounded-xl overflow-hidden" />
        </ReactFlow>
      </main>
    </div>
  );
}

export default function Flow() {
  return (
    <ReactFlowProvider>
      <FlowContent />
    </ReactFlowProvider>
  );
}
