import { Request, Response } from "express";
import { Hubmodel, EdgeType, NodeType } from "../models/workflow/hubWorkflows";
import { Types } from "mongoose";
import { ApiResponse } from "../utils";
import { WorkflowModel } from "../models/workflow/workflow";

export const uploadWorkflowToHub = async (req: Request, res: Response) => {
  try {
    const {
    
      title,
      description,
      nodes,
      edges,
      promts,
    }: {
   
      title?: string;
      description?: string;
      nodes: NodeType[];
      edges: EdgeType[];
      promts?: string[];
    } = req.body;
const {userId}=req.user
    // Validate required fields
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "User ID is required"));
    }


    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, null, "Nodes are required and must be a non-empty array")
        );
    }

    if (!edges || !Array.isArray(edges)) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Edges are required and must be an array"));
    }

    for (const node of nodes) {
      if (!node.id) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Each node must have an id"));
      }
    }

    for (const edge of edges) {
      if (!edge.source || !edge.target) {
        return res
          .status(400)
          .json(
            new ApiResponse(400, null, "Each edge must have source and target")
          );
      }
    }

    const newWorkflow = new Hubmodel({
      uploader: userId,
      title: title || "Untitled Workflow",
      description: description || "",
      nodes,
      edges,
      promts: promts || [],
      isDeleted: false,
    });

    const savedWorkflow = await newWorkflow.save();

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          savedWorkflow,
          "Workflow uploaded successfully to hub"
        )
      );
  } catch (error: any) {
    console.error("Error uploading workflow:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, error.message || "Internal server error")
      );
  }
};

export const getAllWorkflows = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    const filter: any = { isDeleted: false };
    if (userId) {
      if (!Types.ObjectId.isValid(userId as string)) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Invalid User ID format"));
      }
      filter.uploader = new Types.ObjectId(userId as string);
    }

    const workflows = await Hubmodel.find(filter)
      .populate("uploader", "name email")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json(
        new ApiResponse(200, workflows, "Workflows retrieved successfully")
      );
  } catch (error: any) {
    console.error("Error fetching workflows:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, error.message || "Internal server error")
      );
  }
};


export const getWorkflowById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid workflow ID format"));
    }

    const workflow = await Hubmodel.findOne({
      _id: id,
      isDeleted: false,
    }).populate("uploader", "name email");

    if (!workflow) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Workflow not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, workflow, "Workflow retrieved successfully"));
  } catch (error: any) {
    console.error("Error fetching workflow:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, error.message || "Internal server error")
      );
  }
};

export const copyWorkflowFromHubWithTitle = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId } = req.user || {};
    const { workflowId } = req.params;
    const { title, description } = req.body;

    // Validate userId from auth middleware
    if (!userId) {
      return res
        .status(401)
        .json(new ApiResponse(401, null, "User not authenticated"));
    }

    if (!Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid User ID format"));
    }

    // Validate workflowId
    if (!workflowId) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Workflow ID is required"));
    }

    if (!Types.ObjectId.isValid(workflowId)) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid Workflow ID format"));
    }

    // Find the workflow in HubModel
    const hubWorkflow = await Hubmodel.findOne({
      _id: workflowId,
      isDeleted: false,
    });

    if (!hubWorkflow) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Workflow not found in hub"));
    }

    // Create a new workflow in WorkflowModel with copied data
    const copiedWorkflow = new WorkflowModel({
      userId: new Types.ObjectId(userId),
      title:
        title ||
        (hubWorkflow.title ? `${hubWorkflow.title} (Copy)` : "Copied Workflow"),
      description: description || hubWorkflow.description || "",
      nodes: hubWorkflow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        measured: node.measured,
        selected: false,
        dragging: false,
      })),
      edges: hubWorkflow.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        animated: edge.animated,
        label: edge.label,
        data: edge.data,
      })),
      isPublic: false,
      isDeleted: false,
    });

    // Save the copied workflow
    const savedWorkflow = await copiedWorkflow.save();

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          savedWorkflow,
          "Workflow copied successfully to your workspace"
        )
      );
  } catch (error: any) {
    console.error("Error copying workflow:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, error.message || "Internal server error")
      );
  }
};

// Get user's personal workflows
export const getUserWorkflows = async (req: Request, res: Response) => {
  try {
    const { userId } = req.user || {};

    if (!userId) {
      return res
        .status(401)
        .json(new ApiResponse(401, null, "User not authenticated"));
    }

    if (!Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid User ID format"));
    }

    const workflows = await WorkflowModel.find({
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    }).sort({ createdAt: -1 });

    return res
      .status(200)
      .json(
        new ApiResponse(200, workflows, "Workflows retrieved successfully")
      );
  } catch (error: any) {
    console.error("Error fetching workflows:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, error.message || "Internal server error")
      );
  }
};
