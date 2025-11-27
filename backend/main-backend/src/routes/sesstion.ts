import { Router } from "express";
import { isAuthenticated } from "../middleware";
import { getAllSession, getSessionById } from "../controllers/sesstion";
export const SesstionRouter = Router();
SesstionRouter.get("/get-all-sessions", getAllSession);
SesstionRouter.get("/:sessionId", getSessionById);
