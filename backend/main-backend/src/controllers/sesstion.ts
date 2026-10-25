import { Request, response, Response } from "express";
import { ApiResponse, asyncHandler } from "../utils";
import { ChatSession } from "../models/chat/chatSession";
import mongoose from "mongoose";
import { decryptText } from "../utils/crypto";


const readableTitle = (session: { title?: string; conversation?: any[] }) => {
  const first = session.conversation?.[0];
  if (!first?.encrypted || !session.title || !first.content?.startsWith(session.title)) {
    return session.title;
  }
  try {
    const text = decryptText(first.content, first.iv, first.tag).trim().split("\n")[0];
    return text.length > 60 ? `${text.slice(0, 57)}...` : text;
  } catch {
    return undefined;
  }
};

export const getAllSession = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.user;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json(new ApiResponse(400, "Invalid user ID format"));
    }

    const found = await ChatSession.find({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .select({ sessionId: 1, title: 1, createdAt: 1, conversation: { $slice: 1 } });

    const sessions = found.map(({ conversation, ...s }) => ({
      ...s,
      title: readableTitle({ title: s.title, conversation }),
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, sessions, "Requested sessions"));
  },
);

export const getSessionById = asyncHandler(
  async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { userId } = req.user;
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

    const decryptedSession = {
      ...session,
      title: readableTitle(session),
      conversation: session.conversation.map((message: any) => {
        if (message.encrypted && message.iv && message.tag) {
          try {
            const decryptedContent = decryptText(
              message.content,
              message.iv,
              message.tag,
            );

            return {
              ...message,
              content: decryptedContent,
            };
          } catch (error) {
            console.error(
              `[Decryption Error] Message ${message.messageId}:`,
              error,
            );
            // Return message as-is if decryption fails
            return {
              ...message,
              content: "[Decryption Failed]",
            };
          }
        }

        return message;
      }),
    };

    return res
      .status(200)
      .json(new ApiResponse(200, decryptedSession, "Requested session"));
  },
);
