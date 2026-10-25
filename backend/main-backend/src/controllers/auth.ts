import { Request, Response } from "express";
import {
  ApiError,
  ApiResponse,
  asyncHandler,
  AuthHelper,
  RedisService,
} from "../utils";
import { GoogleConnectApi } from "../utils/google/Connect";
import { IAuth, OAuth, UserDetails } from "../types";
import { createAccountViaOauth, getUserViaEmail } from "../services/db";
import { ENV } from "../config";
import { getGitHubUser } from "../utils/Github";
import { ServiceConnection } from "../models/connect/serviceConnection";
import { ConnectionDefinition } from "../models/connect/connectionDefinition";
import mongoose from "mongoose";

export const GoogleAuthInit = asyncHandler((req: Request, res: Response) => {
  const googleApi = new GoogleConnectApi();
  const authUrl = googleApi.getAuthUrl();

  if (!authUrl) {
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to generate Google OAuth URL"));
  }

  res
    .status(200)
    .json(new ApiResponse(300, authUrl, "Redirect to Google OAuth"));
});

export const GoogleAuthCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const googleApi = new GoogleConnectApi();
    const { code, state } = req.query;

    if (!state || typeof state !== "string") {
      throw new ApiError(400, "Missing state parameter");
    }

    if (state === "auth") {
      if (!code || typeof code !== "string") {
        throw new ApiError(400, "Authorization code is missing");
      }

      const tokens = await googleApi.getTokens(code);
      if (!tokens.access_token) {
        throw new ApiError(400, "Failed to retrieve access token from Google");
      }

      const userInfo = await googleApi.getUserInfo(tokens.access_token);
      if (!userInfo) {
        throw new ApiError(400, "Failed to fetch user info from Google");
      }

      const refinedUser = {
        email: userInfo.email!,
        name: userInfo.name!,
        avatarUrl: userInfo.picture!,
        googleId: userInfo.id!,
      };

      let user = await getUserViaEmail(userInfo.email!);
      if (!user) {
        user = await createAccountViaOauth("google", refinedUser);
      }

      const accessToken = user.generateAccessToken();
      const refreshToken = await user.generateRefreshToken();
      await user.save();

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        domain: "localhost",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        domain: "localhost",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.redirect("http://localhost:5173");
    }

    const authHelper = new AuthHelper();
    const authToken = req.cookies?.accessToken;
    if (!authToken) {
      return res.redirect("http://localhost:5173/login");
    }

    const decoded = authHelper.verifyUser(authToken);
    if (!decoded) {
      return res.redirect("http://localhost:5173/login");
    }

    if (!code || typeof code !== "string") {
      return res.redirect(
        `http://localhost:5173/settings/integrations/?open=${encodeURIComponent(
          state
        )}&error=missing_code&update=false`
      );
    }

    const tokens = await googleApi.getTokens(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      console.error("Failed to exchange code for access token");
      return res.redirect(
        `http://localhost:5173/settings/integrations/?open=${encodeURIComponent(
          state
        )}&error=token_exchange_failed&update=false`
      );
    }

    const scopeString = tokens.scope;
    if (
      !scopeString ||
      typeof scopeString !== "string" ||
      !scopeString.trim()
    ) {
      console.error("No scopes returned by Google token exchange.");
      return res.redirect(
        `http://localhost:5173/settings/integrations/?open=${encodeURIComponent(
          state
        )}&error=missing_scopes&update=false`
      );
    }

    const scopes = scopeString
      .trim()
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (scopes.length === 0) {
      console.warn("Token contained an empty scope list.");
      return res.redirect(
        `http://localhost:5173/settings/integrations/?open=${encodeURIComponent(
          state
        )}&error=empty_scopes&update=false`
      );
    }

    const connectionDef = await ConnectionDefinition.findOne({
      service: state,
    });
    if (!connectionDef) {
      console.error("No ConnectionDefinition found for:", state);
      return res.redirect(
        `http://localhost:5173/settings/integrations/?open=${encodeURIComponent(
          state
        )}&error=service_not_found&update=false`
      );
    }
    interface IScopeWithId {
      name: string;
      description: string;
      _id: string;
    }

    const scopesID: string[] = scopes
      .map((scope: string) => {
        const match = connectionDef.scopes?.find(
          (defScope) => defScope.name === scope
        ) as IScopeWithId;
        return match ? match._id.toString() : null;
      })
      .filter(Boolean) as string[];

    if (scopesID.length === 0) {
      console.warn("No matching scopes found for service:", state);
      return res.redirect(
        `http://localhost:5173/settings/integrations/?open=${encodeURIComponent(
          state
        )}&error=no_matching_scopes&update=false`
      );
    }

    let existingConnection = await ServiceConnection.findOne({
      userId: decoded.userId,
      connectionDefId: connectionDef._id,
    });

    if (!existingConnection) {
      await ServiceConnection.create({
        userId: decoded.userId,
        connectionDefId: connectionDef._id,
        connectedScops: scopesID.map((id) => new mongoose.Types.ObjectId(id)),
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        status: "connected",
        expiresAt: tokens.expiry_date,
      });
    } else {
      existingConnection.connectedScops = scopesID;
      existingConnection.accessToken = tokens.access_token;
      existingConnection.refreshToken = tokens.refresh_token;
      existingConnection.status = "connected";
      existingConnection.expiresAt = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : undefined;

      await existingConnection.save();
    }

    return res.redirect(
      `http://localhost:5173/settings/integrations/?open=${encodeURIComponent(
        state
      )}&success=true&update=true`
    );
  }
);

export const GitHubAuthInit = asyncHandler(
  async (req: Request, res: Response) => {
    const redirectUri = `https://github.com/login/oauth/authorize?client_id=${ENV.GITHUB_CLIENT_ID}&scope=user:email`;
    return res.redirect(redirectUri);
  }
);

export const GitHubAuthCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const { code } = req.query;

    if (!code || typeof code !== "string")
      throw new ApiError(400, "Authorization code is missing");

    const userInfo = await getGitHubUser(code);
    if (!userInfo)
      throw new ApiError(400, "Failed to fetch user info from Google");

    const refinedUser: OAuth = {
      email: userInfo.email!,
      name: userInfo.name!,
      avatarUrl: userInfo.avatar_url!,
      githubId: JSON.stringify(userInfo.id)!,
    };

    let user;
    const existingUser = await getUserViaEmail(userInfo.email!);
    if (existingUser) {
      user = existingUser;
    } else {
      user = await createAccountViaOauth("google", refinedUser);
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    await user.save();
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      domain: "localhost",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      domain: "localhost",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect("http://localhost:5173");
  }
);

export const getCurrentUser = asyncHandler(
  async (req: Request, res: Response) => {
    const redisService = new RedisService();
    const { userId } = req.user;
    const details: UserDetails | null = await redisService.getUserDetails(
      userId
    );

    if (!details) {
      throw new ApiError(404, "User not found");
    }
    return res.json(new ApiResponse(200, details));
  }
);
