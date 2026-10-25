import { calendar } from "googleapis/build/src/apis/calendar";
import {
  gmailDeleteAgent,
  gmailReaderAgent,
  gmailTrashAgent,
  gmailWriterAgent,
} from "../agents/gmail";
import {
  sheetsFormattingAgent,
  sheetsManagementAgent,
  sheetsReaderAgent,
  sheetsStructureAgent,
  sheetsWriterAgent,
} from "../agents/sheet";
import {
  calendarDeleteAgent,
  calendarReaderAgent,
  calendarWriterAgent,
} from "../agents/calender";
import {
  meetCreatorAgent,
  meetDeleteAgent,
  meetEditorAgent,
  meetReaderAgent,
} from "../agents/meet";

interface NodeData {
  service?: string;
  name?: string;
  description?: string;
  svgpath?: string;
}

interface Node {
  id: string;
  type: "Start" | "End" | "Agent" | "Checker" | "HIL" | "Error";
  position?: { x: number; y: number };
  data?: NodeData;
  measured?: { width: number; height: number };
  selected?: boolean;
  dragging?: boolean;
}

interface Edge {
  id?: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
  animated?: boolean;
}

interface HumanInLoopData {
  nodeId: string;
  isInterrupt: boolean;
  state: Record<string, any>;
}

interface ErrorData {
  nodeId: string;
  isError: boolean;
  msg: string;
}

interface CheckerData {
  humanInLoop: HumanInLoopData | null;
  error: ErrorData | null;
}

interface ExecutionStage {
  stage: number;
  node: string;
  data: NodeData | CheckerData | {};
  nodeId: string;
  nextNodeId: string | null;
  end: boolean;
}

interface ExecutionResult {
  errors: string[];
  sequence: ExecutionStage[];
}

interface WorkflowRequest {
  nodes: Node[];
  edges: Edge[];
}

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

interface AgentContext {
  stageNumber: number;
  totalStages: number;
  agentRole?: string;
  taskDescription?: string;
  service?: string;
}

const ServiceToAgentMap = {
  gmail: {
    gmailReaderAgent,
    gmailWriterAgent,
    gmailDeleteAgent,
    gmailTrashAgent,
  },
  sheets: {
    sheetsReaderAgent,
    sheetsWriterAgent,
    sheetsFormattingAgent,
    sheetsManagementAgent,
    sheetsStructureAgent,
  },
  calendar: {
    calendarDeleteAgent,
    calendarWriterAgent,
    calendarReaderAgent,
  },
  meet: {
    meetDeleteAgent,
    meetEditorAgent,
    meetReaderAgent,
    meetCreatorAgent,
  },
} as const;

type Service = keyof typeof ServiceToAgentMap;
type AgentName<S extends Service> = keyof (typeof ServiceToAgentMap)[S];

export class WorkflowService {
  private findConnections(
    edges: Edge[],
    nodeId: string,
    handleType: string | null = null
  ): Edge[] {
    return edges.filter((edge) => {
      if (handleType) {
        return edge.source === nodeId && edge.sourceHandle === handleType;
      }
      return edge.source === nodeId;
    });
  }

  private findNode(nodes: Node[], nodeId: string): Node | undefined {
    return nodes.find((n) => n.id === nodeId);
  }

  private validateWorkflow(nodes: Node[], edges: Edge[]): string[] {
    const errors: string[] = [];
    const nodeIds = new Set(nodes.map((n) => n.id));

    // Validate edges reference existing nodes
    edges.forEach((edge, index) => {
      if (!nodeIds.has(edge.source)) {
        errors.push(
          `Edge ${index + 1} references non-existent source node: ${
            edge.source
          }`
        );
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(
          `Edge ${index + 1} references non-existent target node: ${
            edge.target
          }`
        );
      }
    });

    // Validate Start node
    const startNodes = nodes.filter((n) => n.type === "Start");
    if (startNodes.length === 0) {
      errors.push("Workflow must have a Start node");
    } else if (startNodes.length > 1) {
      errors.push("Workflow must have only one Start node");
    }

    // Validate End node
    const endNodes = nodes.filter((n) => n.type === "End");
    if (endNodes.length === 0) {
      errors.push("Workflow must have an End node");
    }

    // Validate Agent nodes must be followed by Checker
    nodes.forEach((node) => {
      if (node.type === "Agent") {
        const outgoing = this.findConnections(edges, node.id);
        const nextNode =
          outgoing.length > 0 ? this.findNode(nodes, outgoing[0].target) : null;
        if (!nextNode || nextNode.type !== "Checker") {
          errors.push(
            `Agent "${
              node.data?.name || node.id
            }" must be followed by a Checker`
          );
        }
      }
    });

    // Validate Checker nodes must have Error and HIL connections.
    // Checker may also connect (as its next/main flow) to Agent or End.
    nodes.forEach((node) => {
      if (node.type === "Checker") {
        const outgoing = this.findConnections(edges, node.id);
        const connectedTypes = outgoing
          .map((e) => this.findNode(nodes, e.target)?.type)
          .filter(Boolean) as string[];

        const hasError = connectedTypes.includes("Error");
        const hasHIL = connectedTypes.includes("HIL");

        if (!hasError) {
          errors.push(
            `Checker node "${node.id}" must have an Error node connected`
          );
        }
        if (!hasHIL) {
          errors.push(
            `Checker node "${node.id}" must have a Human-in-Loop (HIL) node connected`
          );
        }

        // Optional: ensure that if Checker has a "next" connection it's to Agent or End
        // (not required, but can warn/validate if you want strictness)
        // const nextTargets = outgoing
        //   .map((e) => this.findNode(nodes, e.target))
        //   .filter(Boolean) as Node[];
        // if (nextTargets.some((t) => t.type !== "Error" && t.type !== "HIL" && t.type !== "Agent" && t.type !== "End")) {
        //   errors.push(`Checker node "${node.id}" has an invalid next connection type (allowed: Agent, End, Error, HIL).`);
        // }
      }
    });

    // Check for disconnected nodes (excluding Start, Error and HIL)
    nodes.forEach((node) => {
      if (node.type === "Start") return;

      const hasIncoming = edges.some((e) => e.target === node.id);
      if (!hasIncoming && node.type !== "Error" && node.type !== "HIL") {
        errors.push(`Node ${node.id} (${node.type}) is disconnected`);
      }
    });

    return errors;
  }

  generateExecutionSequence(nodes: Node[], edges: Edge[]): ExecutionResult {
    // Validate workflow first
    const validationErrors = this.validateWorkflow(nodes, edges);
    if (validationErrors.length > 0) {
      return { errors: validationErrors, sequence: [] };
    }

    // Build execution sequence
    const sequence: ExecutionStage[] = [];
    const visited = new Set<string>();
    let stage = 1;

    // Find start node
    const startNode = nodes.find((n) => n.type === "Start");

    const traverse = (currentNodeId: string): void => {
      if (visited.has(currentNodeId)) return;
      visited.add(currentNodeId);

      const currentNode = this.findNode(nodes, currentNodeId);
      if (!currentNode) return;

      const stageData: ExecutionStage = {
        stage: stage++,
        node: currentNode.type,
        data: {},
        nodeId: currentNode.id,
        nextNodeId: null,
        end: false,
      };

      // Add specific data based on node type
      if (currentNode.type === "Agent") {
        stageData.data = {
          service: currentNode.data?.service || "",
          name: currentNode.data?.name || "",
          description: currentNode.data?.description || "",
        };
      }

      if (currentNode.type === "Checker") {
        const allOutgoing = this.findConnections(edges, currentNode.id);

        let errorNodeId: string | null = null;
        let hilNodeId: string | null = null;
        let nextNodeId: string | null = null;

        // Identify Error and HIL; also pick a next node if it's Agent or End (preferred).
        allOutgoing.forEach((edge: Edge) => {
          const targetNode = this.findNode(nodes, edge.target);
          if (!targetNode) return;

          if (targetNode.type === "Error") {
            errorNodeId = edge.target;
          } else if (targetNode.type === "HIL") {
            hilNodeId = edge.target;
          } else if (targetNode.type === "Agent" || targetNode.type === "End") {
            // Prefer explicit Agent/End connections as the next flow
            if (!nextNodeId) nextNodeId = edge.target;
          } else if (edge.sourceHandle === "output" && !nextNodeId) {
            // Fallback: if a connection uses the 'output' handle, treat that as next
            nextNodeId = edge.target;
          }
        });

        stageData.data = {
          humanInLoop: hilNodeId
            ? {
                nodeId: hilNodeId,
                isInterrupt: false,
                state: {},
              }
            : null,
          error: errorNodeId
            ? {
                nodeId: errorNodeId,
                isError: false,
                msg: "",
              }
            : null,
        };
        stageData.nextNodeId = nextNodeId;
      }

      if (currentNode.type === "End") {
        stageData.end = true;
        stageData.nextNodeId = null;
      }

      // Find next node for non-Checker nodes
      if (currentNode.type !== "Checker" && currentNode.type !== "End") {
        const outgoing = this.findConnections(edges, currentNode.id);
        if (outgoing.length > 0) {
          // prefer the 'output' handle if present
          const outputEdge = outgoing.find((e) => e.sourceHandle === "output");
          const chosen = outputEdge || outgoing[0];
          stageData.nextNodeId = chosen.target;
        }
      }

      sequence.push(stageData);

      // Continue traversal:
      // - For Checker: follow stageData.nextNodeId (if present) to Agent or End (skip Error/HIL)
      // - For others: continue as before but prefer 'output' handle connections.
      if (currentNode.type === "Checker") {
        if (stageData.nextNodeId) {
          const nextNode = this.findNode(nodes, stageData.nextNodeId);
          if (
            nextNode &&
            nextNode.type !== "Error" &&
            nextNode.type !== "HIL"
          ) {
            traverse(stageData.nextNodeId);
          }
        }
      } else if (
        currentNode.type !== "End" &&
        currentNode.type !== "Error" &&
        currentNode.type !== "HIL"
      ) {
        const outgoing = this.findConnections(edges, currentNode.id, "output");
        if (outgoing.length === 0) {
          const anyOutgoing = this.findConnections(edges, currentNode.id);
          if (anyOutgoing.length > 0) {
            const nextNode = this.findNode(nodes, anyOutgoing[0].target);
            if (
              nextNode &&
              nextNode.type !== "Error" &&
              nextNode.type !== "HIL"
            ) {
              traverse(anyOutgoing[0].target);
            }
          }
        } else {
          outgoing.forEach((edge: Edge) => {
            const nextNode = this.findNode(nodes, edge.target);
            if (
              nextNode &&
              nextNode.type !== "Error" &&
              nextNode.type !== "HIL"
            ) {
              traverse(edge.target);
            }
          });
        }
      }
    };

    if (startNode) {
      traverse(startNode.id);
    }

    return { errors: [], sequence };
  }
  getAgent<S extends Service>(service: S, agentName: AgentName<S>) {
    return ServiceToAgentMap[service][agentName];
  }
  generatePrompt = (
    isFirstAgent: boolean,
    nextStage: AgentContext,
    userPrompt: string,
    previousResponse?: any, // Changed from string to any
    context?: Record<string, any>
  ): string => {
    // ============= VALIDATION =============
    if (!userPrompt || userPrompt.trim().length === 0) {
      throw new Error("User prompt cannot be empty");
    }

    // Fixed: Check for existence, not string methods
    if (
      !isFirstAgent &&
      (previousResponse === undefined || previousResponse === null)
    ) {
      throw new Error("Previous response is required for non-first agents");
    }

    if (!nextStage || typeof nextStage.stageNumber !== "number") {
      throw new Error("Valid next stage information is required");
    }

    // ============= SYSTEM CONTEXT =============
    const systemContext = `You are part of a multi-agent AI executor system working collaboratively to solve complex tasks.
Current Stage: ${nextStage.stageNumber}${
      nextStage.totalStages ? `/${nextStage.totalStages}` : ""
    }
${nextStage.agentRole ? `Your Role: ${nextStage.agentRole}` : ""}
${nextStage.taskDescription ? `Task Focus: ${nextStage.taskDescription}` : ""}
${nextStage?.service ? `Service: ${nextStage?.service}` : ""}`;

    let generatedPrompt: string;

    // ============= FIRST AGENT PROMPT =============
    if (isFirstAgent) {
      generatedPrompt = `${systemContext}

=== ORIGINAL USER REQUEST ===
${userPrompt}

=== YOUR TASK ===
You are the first agent in this multi-agent pipeline. Your responsibilities:

1. Analyze the user's request thoroughly
2. Break down the task into logical components
3. Identify what needs to be accomplished
4. Provide initial insights, data, or processing for the next agent
5. Structure your response clearly for the next stage

${
  context?.additionalInstructions
    ? `\nAdditional Instructions:\n${context.additionalInstructions}`
    : ""
}

Please provide a comprehensive response that will help the next agent continue this task effectively.`;
    }
    // ============= SUBSEQUENT AGENT PROMPT =============
    else {
      // Format previous response (handle objects and strings)
      let formattedPreviousResponse: string;
      try {
        if (typeof previousResponse === "string") {
          formattedPreviousResponse = previousResponse;
        } else if (typeof previousResponse === "object") {
          formattedPreviousResponse = JSON.stringify(previousResponse, null, 2);
        } else {
          formattedPreviousResponse = String(previousResponse);
        }
      } catch (error) {
        // Fallback if JSON.stringify fails
        formattedPreviousResponse = String(previousResponse);
      }

      generatedPrompt = `${systemContext}

=== ORIGINAL USER REQUEST ===
${userPrompt}

=== PREVIOUS AGENT'S RESPONSE ===
${formattedPreviousResponse}

=== YOUR TASK ===
You are agent #${
        nextStage.stageNumber
      } in this multi-agent pipeline. Your responsibilities:

1. Review the original user request and the previous agent's work
2. Build upon the previous agent's response
3. ${
        nextStage.taskDescription ||
        "Continue processing and refining the solution"
      }
4. Identify any gaps or areas that need improvement
5. Provide your contribution that advances toward the final goal

${
  context?.additionalInstructions
    ? `\nAdditional Instructions:\n${context.additionalInstructions}`
    : ""
}

${
  nextStage.stageNumber === nextStage.totalStages
    ? "\n⚠️ NOTE: You are the FINAL agent. Provide a complete, polished response to the user."
    : "\nProvide a clear, structured response for the next agent to build upon."
}`;
    }

    // ============= METADATA (OPTIONAL) =============
    if (context?.metadata) {
      generatedPrompt += `\n\n=== METADATA ===\n${JSON.stringify(
        context.metadata,
        null,
        2
      )}`;
    }

    return generatedPrompt.trim();
  };
}
