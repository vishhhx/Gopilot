import { Router } from "express";

import { isAuthenticated } from "../middleware";
import { generateWorkflowFromPrompt } from "../controllers/other";
import { listPickerItems } from "../controllers/pickers";

const router = Router();

router.post("/generate-workflow", isAuthenticated, generateWorkflowFromPrompt);
router.get("/pickers/:kind", isAuthenticated, listPickerItems);

export { router as otherRouter };
