import { Router } from "express";
import { isAuthenticated } from "../middleware";
import { HandleNormalChat, handleInitChat } from "../controllers/agent";
export const Agentrouter = Router();

Agentrouter.post("/chat/:sessionId", HandleNormalChat);
Agentrouter.post("/init", handleInitChat);
