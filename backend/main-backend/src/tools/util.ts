import { RunContext, tool } from "@openai/agents";
import { z } from "zod";
import { ServiceConnection } from "../models/connect/serviceConnection";
import { AuthModel } from "../models";
interface userDeatils {
  userId: string;
}
export const getRefreshTokenTool = tool({
  name: "get-refresh-token",
  description: "Get the refresh token from DB",
  parameters: z.object({
    service: z.string().describe("The service name (e.g., gmail, drive)"),
  }),

  execute: async ({ service }, runContext?: RunContext<userDeatils>) => {
    console.log(
      service,
      "calledd................................................."
    );
    try {
      const userId = runContext?.context?.userId;

      if (!userId) {
        return {
          success: false,
          data: null,
          error: "User ID not found in context",
        };
      }

      const connections = await ServiceConnection.find({ userId })
        .populate({
          path: "connectionDefId",
          match: { service },
          select: "service",
        })
        .select("connectionDefId userId status refreshToken");

      const data = connections
        .filter(
          (c) => c.connectionDefId && typeof c.connectionDefId === "object"
        )
        .map((c) => ({
          service: (c.connectionDefId as any).service,
          userId: c.userId,
          status: c.status,
          refreshToken: c.refreshToken,
        }));

      if (data.length > 0) {
        return {
          success: true,
          data,
        };
      } else {
        return {
          success: false,
          data: null,
          error: `No refreshToken found for service ${service}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        data: null,
        error:
          err?.message ?? "Unknown error occurred in get-refresh-token tool",
      };
    }
  },
});

export const getUserDetails = tool({
  name: "get-user-details",
  description: "Fetch basic user details from the AuthModel using the userId.",
  parameters: z.object({
    userId: z.string().describe("The user ID whose details are needed"),
  }),
  execute: async ({ userId }) => {
    try {
      const userDetails = await AuthModel.findById(userId).select("name email");

      if (!userDetails) {
        return {
          success: false,
          error: "User not found",
          data: null,
        };
      }

      return {
        success: true,
        data: userDetails,
      };
    } catch (err) {
      return {
        success: false,
        error: "Failed to fetch user details",
        data: null,
      };
    }
  },
});
