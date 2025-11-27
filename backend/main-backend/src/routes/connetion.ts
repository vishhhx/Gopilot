import { Router } from "express";
import {
  addConnectionDef,
  getAllServices,
  GoogleServiceInt,
} from "../controllers";
import { isAuthenticated } from "../middleware";

const router = Router();

router.post("/dev/add-connections-def", addConnectionDef);
router.get("/get-all-connetions", isAuthenticated, getAllServices);
router.post("/google-service-init", isAuthenticated, GoogleServiceInt);
export { router as connectionRouter };
