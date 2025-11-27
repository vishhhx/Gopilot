import express, { Router } from "express";
import {
  GoogleAuthCallback,
  GoogleAuthInit,
  GitHubAuthInit,
  GitHubAuthCallback,
  getCurrentUser,
} from "../controllers";
import { isAuthenticated } from "../middleware";

const authRouter: Router = express.Router();

authRouter.get("/google/oauth-init", GoogleAuthInit);
authRouter.get("/google/callback", GoogleAuthCallback);
authRouter.get("/github/oauth-init", GitHubAuthInit);
authRouter.get("/github/callback", GitHubAuthCallback);
authRouter.get("/me", isAuthenticated, getCurrentUser);
export { authRouter };
