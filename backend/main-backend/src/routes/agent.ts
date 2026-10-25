import { Router } from "express";
import { isAuthenticated } from "../middleware";
import { HandleNormalChat, handleInitChat, runWorkflowInChat } from "../controllers/agent";
export const Agentrouter = Router();

Agentrouter.post("/chat/:sessionId", isAuthenticated, HandleNormalChat);
Agentrouter.post("/init", isAuthenticated, handleInitChat);
Agentrouter.post("/chat/:sessionId/workflow", isAuthenticated, runWorkflowInChat);
