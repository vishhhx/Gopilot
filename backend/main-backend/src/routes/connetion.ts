import { Router } from "express";
import {
  getAllServices,
  GoogleServiceInt,
} from "../controllers";
import { isAuthenticated } from "../middleware";

const router = Router();

router.get("/get-all-connetions", isAuthenticated, getAllServices);
router.post("/google-service-init", isAuthenticated, GoogleServiceInt);
export { router as connectionRouter };
