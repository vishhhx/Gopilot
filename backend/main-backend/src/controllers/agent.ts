import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "../utils";
import { orchestratorAgent } from "../agents/orchestrator";
import { run } from "@openai/agents";
import OpenAI from "openai";
import { ChatSession, SenderType } from "../models/chat/chatSession";
import { Types } from "mongoose";
import { ServiceConnection } from "../models/connect/serviceConnection";
export const HandleNormalChat = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      const { sessionId } = req.params;
      const userId = "68f67b23041811cb079e00c8";
      const services = ["gmail", "sheets", "forms", "drive"];

      const connections = await ServiceConnection.find({ userId })
        .populate({
          path: "connectionDefId",
          select: "service",
        })
        .select("connectionDefId userId status refreshToken");

      const context = connections
        .filter(
          (c) =>
            c.connectionDefId &&
            typeof c.connectionDefId === "object" &&
            services.includes((c.connectionDefId as any).service) &&
            c.refreshToken
        )
        .map((c) => ({
          service: (c.connectionDefId as any).service,
          refreshToken: c.refreshToken as string,
        }));

      console.log("[HandleNormalChat] context:", context);

      const chatSession = await ChatSession.findOne({ sessionId });
      if (!chatSession) {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Chat session not found"));
      }

      const orchestrator = await run(orchestratorAgent, message, {
        context,
        conversationId: sessionId,
      });

      const agentResponse = orchestrator.finalOutput ?? orchestrator.output;
      console.log("[HandleNormalChat] orchestrator response:", agentResponse);

      await chatSession.addMessage(SenderType.USER, message);

      let responseData: any;

      if (Array.isArray(agentResponse)) {
        responseData = agentResponse[agentResponse.length - 1];
      } else {
        responseData = agentResponse;
      }

      if (
        responseData &&
        typeof responseData === "object" &&
        "isDynamic" in responseData &&
        responseData.isDynamic
      ) {
        await chatSession.addMessage(SenderType.AGENT, responseData.content, {
          agentName: "orchestrator",
          isDynamic: true,
          dynamicContent: responseData.dynamicContent,
          metadata: {
            model: "gpt-4",
            responseTime: Date.now(),
          },
        });
      } else {
        const textContent =
          typeof responseData === "string"
            ? responseData
            : JSON.stringify(responseData);

        await chatSession.addMessage(SenderType.AGENT, textContent, {
          agentName: "orchestrator",
          isDynamic: false,
          metadata: {
            model: "gpt-4",
            responseTime: Date.now(),
          },
        });
      }

      return res.status(200).json(
        new ApiResponse(200, {
          result: responseData,
          sessionId: chatSession.sessionId,
        })
      );
    } catch (err: any) {
      console.error("[HandleNormalChat] error:", err);
      return res
        .status(500)
        .json(
          new ApiResponse(500, { error: err?.message ?? err }, "Internal error")
        );
    }
  }
);
export const handleInitChat = asyncHandler(
  async (req: Request, res: Response) => {
    const client = new OpenAI();
    const initialMessage = req.body;
    const userId = "68f67b23041811cb079e00c8";
    const { id: conversationId } = await client.conversations.create({
      metadata: {
        userId: userId,
      },
    });

    const chatSession = await ChatSession.createSession(
      new Types.ObjectId(userId),
      initialMessage?.content
        ? {
            sender: SenderType.USER,
            content: initialMessage.content,
          }
        : undefined
    );
    chatSession.sessionId = conversationId;
    chatSession.metadata = {
      ...chatSession.metadata,
      openAiConversationId: conversationId,
      totalMessages: chatSession.metadata?.totalMessages ?? 0,
    };
    await chatSession.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          conversationId: conversationId,
          sessionId: chatSession._id,
          session: chatSession,
        },
        "Your new session created successfully"
      )
    );
  }
);
