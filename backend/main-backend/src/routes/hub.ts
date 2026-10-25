import express from "express";
import {
  uploadWorkflowToHub,
  getAllWorkflows,
  getWorkflowById,
  copyWorkflowFromHubWithTitle,
  getUserWorkflows,
} from "../controllers/hub";
import { isAuthenticated } from "../middleware/auth";

const hubRouter = express.Router();

hubRouter.post("/upload", isAuthenticated, uploadWorkflowToHub);

hubRouter.get("/hub", isAuthenticated, getAllWorkflows);

hubRouter.get("/hub/:id", isAuthenticated, getWorkflowById);

hubRouter.post(
  "/copy/:workflowId",
  isAuthenticated,
  copyWorkflowFromHubWithTitle
);

hubRouter.get("/my-workflows", isAuthenticated, getUserWorkflows);

export default hubRouter;
