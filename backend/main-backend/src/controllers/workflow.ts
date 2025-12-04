import { Request, Response } from "express";
import { Types } from "mongoose";
import { ApiResponse, asyncHandler, RedisService } from "../utils";
import { WorkflowModel, NodeType, EdgeType } from "../models/workflow/workflow";
import { WorkflowService } from "../utils/workflow";
import { run } from "@openai/agents";
import { ServiceConnection } from "../models/connect/serviceConnection";

export const createWorkflow = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
    }

    const { title, description, nodes = [], edges = [] } = req.body;

    if (!title) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "title is required"));
    }

    const initialNode: NodeType[] = [
      {
        id: crypto.randomUUID(),
        dragging: false,
        measured: {
          height: 124,
          width: 224,
        },
        position: {
          x: 0,
          y: 0,
        },
        type: "Start",
        selected: true,
      },
    ];
    const workflow = await WorkflowModel.create({
      userId: userId,
      title,
      description,
      nodes: initialNode,
      edges,
    });

    if (!workflow) {
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to create workflow"));
    }

    return res
      .status(201)
      .json(new ApiResponse(201, { workflow }, "Workflow created"));
  }
);

export const getWorkflowById = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid workflow id"));
    }
    const workflow = await WorkflowModel.findById(id).lean();
    if (!workflow) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Workflow not found"));
    }
    if (
      !workflow.userId?.toString() ||
      workflow.userId.toString() !== String(userId)
    ) {
      return res.status(403).json(new ApiResponse(403, null, "Forbidden"));
    }
    return res.status(200).json(new ApiResponse(200, { workflow }, ""));
  }
);

export const getWorkflowsByUser = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
    }
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.pageSize || "20"), 10))
    );
    const skip = (page - 1) * pageSize;

    const [total, workflows] = await Promise.all([
      WorkflowModel.countDocuments({ userId: userId, isDeleted: false }),
      WorkflowModel.find({ userId: userId, isDeleted: false })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);

    return res.status(200).json(
      new ApiResponse(200, {
        meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) },
        workflows,
      })
    );
  }
);
export const updateWorkflowNodesEdges = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { nodes, edges } = req.body;

    if (!userId) {
      return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
    }

    if (!Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid workflow id"));
    }

    const workflow = await WorkflowModel.findById(id);
    if (!workflow) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Workflow not found"));
    }

    if (workflow.userId.toString() !== String(userId)) {
      return res.status(403).json(new ApiResponse(403, null, "Forbidden"));
    }

    const updatePayload: any = {};

    if (Array.isArray(nodes)) {
      updatePayload.nodes = nodes;
    }

    // Validate and clean edges
    if (Array.isArray(edges)) {
      // Get all valid node IDs
      const nodeIds = new Set(
        (nodes || workflow.nodes).map((n: NodeType) => n.id)
      );

      // Filter out orphaned edges and log them
      const validEdges = edges.filter((edge: EdgeType) => {
        const isValid = nodeIds.has(edge.source) && nodeIds.has(edge.target);
        if (!isValid) {
          console.warn(
            `Removing orphaned edge: ${edge.id} (source: ${edge.source}, target: ${edge.target})`
          );
        }
        return isValid;
      });

      // Log cleanup if any edges were removed
      if (validEdges.length !== edges.length) {
        console.log(
          `Cleaned up ${
            edges.length - validEdges.length
          } orphaned edges for workflow ${id}`
        );
      }

      updatePayload.edges = validEdges;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, null, "No nodes or edges provided to update")
        );
    }

    await WorkflowModel.updateOne({ _id: id }, { $set: updatePayload });

    const updated = await WorkflowModel.findById(id).lean();

    return res
      .status(200)
      .json(new ApiResponse(200, { workflow: updated }, "Workflow updated"));
  }
);

interface StageNode {
  stage: number;
  node: string;
  data: any;
  nodeId: string;
  nextNodeId: string | null;
  end: boolean;
}

interface AgentResponse {
  stage: number;
  nodeId: string;
  response: any;
  service?: string;
  agentName?: string;
}

interface ErrorInfo {
  stage: number;
  nodeId: string;
  error: any;
  service?: string;
  agentName?: string;
}

interface InterruptInfo {
  stage: number;
  nodeId: string;
  state: any;
  service?: string;
  agentName?: string;
}

export const Execute = asyncHandler(async (req: Request, res: Response) => {
  const { nodes, edges, userPrompt } = req.body;

  if (!nodes || !edges) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "No nodes or edges provided"));
  }

  if (
    !userPrompt ||
    typeof userPrompt !== "string" ||
    userPrompt.trim().length === 0
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "User prompt is required"));
  }

  if (!Array.isArray(nodes)) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          ["Missing or invalid 'nodes' field"],
          "Invalid request: 'nodes' must be an array"
        )
      );
  }

  if (!Array.isArray(edges)) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          ["Missing or invalid 'edges' field"],
          "Invalid request: 'edges' must be an array"
        )
      );
  }

  if (nodes.length === 0) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          ["Empty nodes array"],
          "Workflow must contain at least one node"
        )
      );
  }

  const nodeIds = new Set(nodes.map((n: any) => n.id));
  const invalidEdges: string[] = [];

  edges.forEach((edge: any, index: number) => {
    if (!nodeIds.has(edge.source)) {
      invalidEdges.push(
        `Edge ${index + 1} references non-existent source node: ${edge.source}`
      );
    }
    if (!nodeIds.has(edge.target)) {
      invalidEdges.push(
        `Edge ${index + 1} references non-existent target node: ${edge.target}`
      );
    }
  });

  let validEdges = edges;
  if (invalidEdges.length > 0) {
    console.warn(
      `Found ${invalidEdges.length} invalid edges, filtering them out`
    );
    validEdges = edges.filter(
      (edge: any) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    if (validEdges.length === 0) {
      return res
        .status(400)
        .json(new ApiResponse(400, invalidEdges, "All edges are invalid"));
    }
  }

  const workflowService = new WorkflowService();
  const result = workflowService.generateExecutionSequence(nodes, validEdges);

  if (result.errors.length > 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, result.errors, "Workflow validation failed"));
  }

  const userId = "68f67b23041811cb079e00c8"; 
  const services = ["gmail", "sheets", "forms", "drive"];

  const connections = await ServiceConnection.find({ userId })
    .populate({
      path: "connectionDefId",
      select: "service",
    })
    .select("connectionDefId userId status refreshToken");

  const context = connections
    .filter(
      (c) =>
        c.connectionDefId &&
        typeof c.connectionDefId === "object" &&
        services.includes((c.connectionDefId as any).service) &&
        c.refreshToken
    )
    .map((c) => ({
      service: (c.connectionDefId as any).service,
      refreshToken: c.refreshToken as string,
    }));

  console.log("[Execute] Service context:", context);

  const sequence: StageNode[] = result.sequence;
  const responses: AgentResponse[] = [];
  const errors: ErrorInfo[] = [];
  const interrupts: InterruptInfo[] = [];
  const redis = new RedisService();

  const findNextAgentNode = (currentStage: number): StageNode | null => {
    for (let i = currentStage; i < sequence.length; i++) {
      const node = sequence[i];
      if (node.node === "Agent") {
        return node;
      }
    }
    return null;
  };

  const getNextStageInfo = (currentStage: number) => {
    const nextAgent = findNextAgentNode(currentStage + 1);
    if (!nextAgent) {
      return null;
    }
    const totalAgents = sequence.filter((n) => n.node === "Agent").length;
    const currentAgentIndex = sequence
      .slice(0, currentStage)
      .filter((n) => n.node === "Agent").length;
    return {
      stageNumber: currentAgentIndex + 2,
      totalStages: totalAgents,
      agentRole: nextAgent.data?.name || "Agent",
      taskDescription: nextAgent.data?.description || "",
      service: nextAgent.data?.service || "",
    };
  };

  // Helper function to extract relevant data from previous response
  const extractRelevantContext = (response: any): string => {
    if (!response) return "";

    // Extract only essential information, avoiding full content duplication
    if (typeof response === "string") {
      return response.length > 300
        ? response.substring(0, 300) + "..."
        : response;
    }

    if (typeof response === "object") {
      // For Gmail: extract key email info
      if (response.emailId || response.messageId) {
        return JSON.stringify({
          emailId: response.emailId || response.messageId,
          from: response.from,
          subject: response.subject,
          snippet: response.snippet || response.body?.substring(0, 200),
        });
      }

      // For Sheets/Forms: extract data structure
      if (response.spreadsheetId || response.formId) {
        return JSON.stringify({
          id: response.spreadsheetId || response.formId,
          title: response.title,
          rowCount: response.rowCount || response.data?.length,
        });
      }

      // Generic object handling - only include non-large fields
      const filtered: any = {};
      for (const [key, value] of Object.entries(response)) {
        if (typeof value === "string" && value.length > 200) {
          filtered[key] = value.substring(0, 200) + "...";
        } else if (Array.isArray(value) && value.length > 5) {
          filtered[key] = `[${value.length} items]`;
        } else {
          filtered[key] = value;
        }
      }
      return JSON.stringify(filtered);
    }

    return String(response);
  };

  // Build dynamic agent prompt
  const buildAgentPrompt = (
    currentStage: StageNode,
    stageIndex: number,
    previousResponse?: any,
    nextStageInfo?: any
  ): string => {
    const agentNodes = sequence.filter((n) => n.node === "Agent");
    const currentAgentIndex = sequence
      .slice(0, stageIndex)
      .filter((n) => n.node === "Agent").length;

    const isFirstAgent = currentAgentIndex === 0;
    const isLastAgent = currentAgentIndex === agentNodes.length - 1;

    let prompt = `You are part of a multi-agent workflow system. Your role is "${
      currentStage.data?.name
    }" (${currentStage.data?.service}).

WORKFLOW CONTEXT:
- Current Stage: ${currentAgentIndex + 1} of ${agentNodes.length}
- Your Task: ${
      currentStage.data?.description || "Execute your specialized function"
    }

USER REQUEST: "${userPrompt}"

`;

    // Add previous agent context if not first
    if (!isFirstAgent && previousResponse) {
      const contextData = extractRelevantContext(previousResponse);
      prompt += `PREVIOUS AGENT OUTPUT:
The previous agent completed their task. Here's the relevant information:
${contextData}

`;
    }

    // Add next agent context if not last
    if (!isLastAgent && nextStageInfo) {
      prompt += `NEXT AGENT INFO:
After you complete your task, the next agent will be "${nextStageInfo.agentRole}" (${nextStageInfo.service}).
Ensure your output includes all necessary information for the next stage.

`;
    }

    // Add specific instructions based on position
    if (isFirstAgent) {
      prompt += `INSTRUCTIONS:
You are the FIRST agent in this workflow. Focus on the initial task from the user request. Structure your output clearly for the next agent to use.

`;
    } else if (isLastAgent) {
      prompt += `INSTRUCTIONS:
You are the FINAL agent in this workflow. Complete the user's request and provide a comprehensive final response.

`;
    } else {
      prompt += `INSTRUCTIONS:
Use the previous agent's output to complete your specific task. Ensure your output is structured for the next agent.

`;
    }

    prompt += `Execute your specialized task now. Be concise and focused.`;

    return prompt;
  };

  try {
    for (let i = 0; i < sequence.length; i++) {
      const stageNode = sequence[i];
      console.log(
        `[Execute] Processing stage ${stageNode.stage}: ${stageNode.node}`
      );

      switch (stageNode.node) {
        case "Start":
          console.log("[Execute] Workflow started");
          break;

        case "Agent": {
          try {
            const agent = workflowService.getAgent(
              stageNode.data?.service,
              stageNode.data?.name
            );

            if (!agent) {
              throw new Error(
                `Agent not found: ${stageNode.data?.service}/${stageNode.data?.name}`
              );
            }

            // Get previous response if exists
            const previousResponse =
              responses.length > 0
                ? responses[responses.length - 1]?.response
                : undefined;

            // Get next stage info
            const nextStageInfo = getNextStageInfo(stageNode.stage);

            // Build dynamic prompt
            const dynamicPrompt = buildAgentPrompt(
              stageNode,
              i,
              previousResponse,
              nextStageInfo
            );

            console.log(
              `[Execute] Agent prompt for stage ${stageNode.stage}:`,
              dynamicPrompt.substring(0, 200) + "..."
            );

            // Execute agent with enhanced prompt
            const agentResult = await run(agent, dynamicPrompt, {
              context,
            });

            const hasInterruptions = agentResult.interruptions?.length > 0;
            if (hasInterruptions) {
              console.log(
                `[Execute] Interruption detected at stage ${stageNode.stage}`
              );
              interrupts.push({
                stage: stageNode.stage,
                nodeId: stageNode.nodeId,
                state: agentResult.state,
                service: stageNode.data?.service,
                agentName: stageNode.data?.name,
              });
              break;
            }

            if (agentResult.finalOutput?.isError) {
              console.error(
                `[Execute] Error at stage ${stageNode.stage}:`,
                agentResult.finalOutput.error
              );
              errors.push({
                stage: stageNode.stage,
                nodeId: stageNode.nodeId,
                error: agentResult.finalOutput.error || "Unknown error",
                service: stageNode.data?.service,
                agentName: stageNode.data?.name,
              });
              break;
            }

            if (agentResult.finalOutput) {
              responses.push({
                stage: stageNode.stage,
                nodeId: stageNode.nodeId,
                response: agentResult.finalOutput,
                service: stageNode.data?.service,
                agentName: stageNode.data?.name,
              });
              console.log(
                `[Execute] Stage ${stageNode.stage} completed successfully`
              );
            }
          } catch (error: any) {
            console.error(
              `[Execute] Exception at stage ${stageNode.stage}:`,
              error
            );
            errors.push({
              stage: stageNode.stage,
              nodeId: stageNode.nodeId,
              error: error.message || "Agent execution failed",
              service: stageNode.data?.service,
              agentName: stageNode.data?.name,
            });
            break;
          }
          break;
        }

        case "Checker": {
          if (errors.length > 0) {
            console.log("[Execute] Checker: Errors detected, halting workflow");
            return res.status(500).json(
              new ApiResponse(
                500,
                {
                  errors,
                  completedStages: responses,
                  failedAt: stageNode.stage,
                },
                "Workflow execution failed with errors"
              )
            );
          }
          if (interrupts.length > 0) {
            console.log("[Execute] Checker: Human in loop required");
            const interruptId = crypto.randomUUID();

            try {
              await redis.addInterrupt(
                interruptId,
                JSON.stringify({
                  interrupt: interrupts[0],
                  completedStages: responses,
                  userPrompt,
                  sequence,
                  currentStage: stageNode.stage,
                })
              );

              return res.status(202).json(
                new ApiResponse(
                  202,
                  {
                    interruptId,
                    interrupt: interrupts[0],
                    completedStages: responses,
                    message: "Human intervention required",
                  },
                  "Workflow paused for human input"
                )
              );
            } catch (redisError: any) {
              console.error("[Execute] Redis error:", redisError);
              return res
                .status(500)
                .json(
                  new ApiResponse(
                    500,
                    { error: redisError.message },
                    "Failed to store interrupt state"
                  )
                );
            }
          }

          console.log(
            `[Execute] Checker at stage ${stageNode.stage}: All checks passed`
          );
          break;
        }

        case "End": {
          console.log("[Execute] Workflow completed successfully");
          const summary = responses.map((r, idx) => ({
            agent: r.agentName,
            service: r.service,
            stage: r.stage,
            output: r.response,
          }));

          return res.status(200).json(
            new ApiResponse(
              200,
              {
                summary,
                totalStages: responses.length,
                responses,
                userPrompt,
              },
              "Workflow executed successfully"
            )
          );
        }

        default:
          console.warn(`[Execute] Unknown node type: ${stageNode.node}`);
          break;
      }
    }

    if (errors.length > 0) {
      return res.status(500).json(
        new ApiResponse(
          500,
          {
            errors,
            completedStages: responses,
          },
          "Workflow execution incomplete due to errors"
        )
      );
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          responses,
          message: "Workflow completed (no End node found)",
        },
        "Workflow execution completed"
      )
    );
  } catch (error: any) {
    console.error("[Execute] Fatal error:", error);
    return res.status(500).json(
      new ApiResponse(
        500,
        {
          error: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
          completedStages: responses,
        },
        "Workflow execution failed"
      )
    );
  }
});
