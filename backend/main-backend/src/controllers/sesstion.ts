import { Request, response, Response } from "express";
import { ApiResponse, asyncHandler } from "../utils";
import { ChatSession } from "../models/chat/chatSession";
import mongoose from "mongoose";

export const getAllSession = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = "68f67b23041811cb079e00c8";

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json(new ApiResponse(400, "Invalid user ID format"));
    }

    const sessions = await ChatSession.find({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .select("sessionId");

    return res
      .status(200)
      .json(new ApiResponse(200, sessions, "Requested sessions"));
  }
);

export const getSessionById = asyncHandler(
  async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const userId = "68f67b23041811cb079e00c8";
    console.log(sessionId);
    if (!sessionId) {
      return res
        .status(400)
        .json(new ApiResponse(400, "Session ID is required"));
    }
    const session = await ChatSession.findOne({
      sessionId,
      userId,
    }).lean();

    if (!session) {
      return res
        .status(404)
        .json(new ApiResponse(404, "Session not found for this user"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, session, "Requested session"));
  }
);
