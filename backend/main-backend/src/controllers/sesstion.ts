import { Request, response, Response } from "express";
import { ApiResponse, asyncHandler } from "../utils";
import { ChatSession } from "../models/chat/chatSession";
import mongoose from "mongoose";
import crypto from 'crypto';
import { ENV } from "../config";
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = ENV.ENCRYPTION_KEY!;

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

const decryptResponse = (encrypted: string, iv: string, tag: string): string => {
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Decryption Error]:', error);
    throw new Error('Failed to decrypt message');
  }
};

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

    // Decrypt messages in the conversation
    const decryptedSession = {
      ...session,
      conversation: session.conversation.map((message: any) => {
        // Check if message is encrypted
        if (message.encrypted && message.iv && message.tag) {
          try {
            const decryptedContent = decryptResponse(
              message.content,
              message.iv,
              message.tag
            );
            
            return {
              ...message,
              content: decryptedContent,
              // Optionally remove encryption metadata from response
              // encrypted: undefined,
              // iv: undefined,
              // tag: undefined,
            };
          } catch (error) {
            console.error(`[Decryption Error] Message ${message.messageId}:`, error);
            // Return message as-is if decryption fails
            return {
              ...message,
              content: '[Decryption Failed]',
            };
          }
        }
        
        // Return unencrypted messages as-is
        return message;
      }),
    };

    return res
      .status(200)
      .json(new ApiResponse(200, decryptedSession, "Requested session"));
  }
);