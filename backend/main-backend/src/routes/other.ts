import { Router } from "express";

import { isAuthenticated } from "../middleware";
import { generateWorkflowFromPrompt } from "../controllers/other";

const router = Router();

router.post("/generate-workflow",generateWorkflowFromPrompt)

export { router as otherRouter };
