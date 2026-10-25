import { Router } from "express";
import {
  checkWorkflow,
  createWorkflow,
  getWorkflowById,
  getWorkflowRun,
  getWorkflowsByUser,
  listWorkflowRuns,
  reviewWorkflowRun,
  startWorkflowRun,
  updateWorkflowNodesEdges,
} from "../controllers/workflow";
import { isAuthenticated } from "../middleware/auth";
const workflowRouter = Router();
workflowRouter.use(isAuthenticated);
workflowRouter.post("/", createWorkflow);
workflowRouter.get("/", getWorkflowsByUser);
workflowRouter.get("/runs/:runId", getWorkflowRun);
workflowRouter.post("/runs/:runId/review", reviewWorkflowRun);
workflowRouter.get("/:id", getWorkflowById);
workflowRouter.patch("/:id/nodes-edges", updateWorkflowNodesEdges);
workflowRouter.get("/:id/check", checkWorkflow);
workflowRouter.post("/:id/runs", startWorkflowRun);
workflowRouter.get("/:id/runs", listWorkflowRuns);
export default workflowRouter;
