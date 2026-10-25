import { Request, Response } from "express";
import { Types } from "mongoose";
import { ApiResponse, asyncHandler } from "../utils";
import { WorkflowModel, NodeType, EdgeType, InputField, INPUT_FIELD_TYPES } from "../models/workflow/workflow";
import { WorkflowRunModel } from "../models/workflow/workflowRun";
import { RunInputError, reviewRun, serializeRun, startRun } from "../workflow/engine";
import { buildPlan } from "../workflow/plan";
import { validTimeZone } from "../utils/time";


/** Cleans the input fields sent by the canvas: a usable key for each, no duplicates. */
const normalizeInputs = (raw: unknown): InputField[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw.slice(0, 20).flatMap((f: any) => {
    const label = String(f?.label ?? "").trim();
    if (!label) return [];
    let key = String(f?.key || label)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "field";
    while (seen.has(key)) key = `${key}_2`;
    seen.add(key);
    return [
      {
        key,
        label,
        type: (INPUT_FIELD_TYPES as readonly string[]).includes(f?.type) ? f.type : "text",
        required: f?.required !== false,
        ...(f?.description ? { description: String(f.description).trim() } : {}),
        ...(f?.type === "select" && Array.isArray(f?.options)
          ? { options: [...new Set(f.options.map((o: unknown) => String(o).trim()).filter(Boolean))].slice(0, 30) as string[] }
          : {}),
      },
    ];
  });
};

export const createWorkflow = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json(new ApiResponse(401, null, "Unauthorized"));
    }

    const { title, description, edges = [], inputs } = req.body;

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
      inputs: normalizeInputs(inputs),
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
    const { nodes, edges, inputs } = req.body;

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

    if (Array.isArray(inputs)) {
      updatePayload.inputs = normalizeInputs(inputs);
    }

    if (Object.keys(updatePayload).length === 0) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, null, "No nodes, edges or inputs provided to update")
        );
    }

    await WorkflowModel.updateOne({ _id: id }, { $set: updatePayload });

    const updated = await WorkflowModel.findById(id).lean();

    return res
      .status(200)
      .json(new ApiResponse(200, { workflow: updated }, "Workflow updated"));
  }
);

/** Loads a workflow the user owns, or sends the error response and returns null. */
const ownWorkflow = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json(new ApiResponse(400, null, "Invalid workflow id"));
    return null;
  }
  const workflow = await WorkflowModel.findOne({ _id: id, userId: req.user.userId, isDeleted: false });
  if (!workflow) {
    res.status(404).json(new ApiResponse(404, null, "Workflow not found"));
    return null;
  }
  return workflow;
};

const ownRun = async (req: Request, res: Response) => {
  const { runId } = req.params;
  if (!Types.ObjectId.isValid(runId)) {
    res.status(400).json(new ApiResponse(400, null, "Invalid run id"));
    return null;
  }
  const run = await WorkflowRunModel.findOne({ _id: runId, userId: req.user.userId });
  if (!run) {
    res.status(404).json(new ApiResponse(404, null, "Run not found"));
    return null;
  }
  return run;
};

/** Problems that would stop the saved workflow from running, per node, for the canvas to show. */
export const checkWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const workflow = await ownWorkflow(req, res);
  if (!workflow) return;
  const plan = buildPlan(workflow.nodes, workflow.edges);
  return res.status(200).json(new ApiResponse(200, plan, "Workflow checked"));
});

/** Starts a run of the saved workflow with the user's inputs; it continues in the background. */
export const startWorkflowRun = asyncHandler(async (req: Request, res: Response) => {
  const workflow = await ownWorkflow(req, res);
  if (!workflow) return;
  try {
    const run = await startRun(workflow, req.user.userId, req.body?.inputs, validTimeZone(req.body?.timeZone));
    return res.status(202).json(new ApiResponse(202, { run: serializeRun(run) }, "Run started"));
  } catch (err) {
    if (err instanceof RunInputError) {
      return res.status(400).json(new ApiResponse(400, { issues: err.issues }, err.message));
    }
    throw err;
  }
});

export const getWorkflowRun = asyncHandler(async (req: Request, res: Response) => {
  const run = await ownRun(req, res);
  if (!run) return;
  return res.status(200).json(new ApiResponse(200, { run: serializeRun(run) }, ""));
});

/** Approve or reject a run waiting at a Human review, or answer an agent's question. */
export const reviewWorkflowRun = asyncHandler(async (req: Request, res: Response) => {
  const run = await ownRun(req, res);
  if (!run) return;
  try {
    await reviewRun(run, req.body?.approved === true, req.body?.note);
    return res.status(200).json(new ApiResponse(200, { run: serializeRun(run) }, "Decision recorded"));
  } catch (err) {
    if (err instanceof RunInputError) {
      return res.status(400).json(new ApiResponse(400, { issues: err.issues }, err.message));
    }
    throw err;
  }
});

/** The workflow's latest runs, newest first. */
export const listWorkflowRuns = asyncHandler(async (req: Request, res: Response) => {
  const workflow = await ownWorkflow(req, res);
  if (!workflow) return;
  const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit || "5"), 10)));
  const runs = await WorkflowRunModel.find({ workflowId: workflow._id }).sort({ createdAt: -1 }).limit(limit);
  return res.status(200).json(new ApiResponse(200, { runs: runs.map(serializeRun) }, ""));
});
