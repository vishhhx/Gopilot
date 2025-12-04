import { Router } from "express";
import {
  createWorkflow,
  Execute,
  getWorkflowById,
  getWorkflowsByUser,
  updateWorkflowNodesEdges,
} from "../controllers/workflow";
import { isAuthenticated } from "../middleware/auth";
const workflowRouter = Router();
workflowRouter.use(isAuthenticated);
workflowRouter.post("/", createWorkflow);
workflowRouter.get("/", getWorkflowsByUser);
workflowRouter.get("/:id", getWorkflowById);
workflowRouter.patch("/:id/nodes-edges", updateWorkflowNodesEdges);
workflowRouter.post("/execute", Execute);
export default workflowRouter;
