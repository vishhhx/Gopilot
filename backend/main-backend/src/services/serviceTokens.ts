import { ServiceConnection } from "../models/connect/serviceConnection";

const CONNECTABLE_SERVICES = ["gmail", "sheets", "form", "forms", "drive", "calendar"];

export interface ServiceToken {
  service: string;
  refreshToken: string;
}

/** The user's Google refresh tokens, passed to every agent tool as the run context. */
export const getServiceTokens = async (userId: string): Promise<ServiceToken[]> => {
  const connections = await ServiceConnection.find({ userId })
    .populate({
      path: "connectionDefId",
      select: "service",
    })
    .select("connectionDefId userId status refreshToken");

  return connections
    .filter(
      (c) =>
        c.connectionDefId &&
        typeof c.connectionDefId === "object" &&
        CONNECTABLE_SERVICES.includes((c.connectionDefId as any).service) &&
        c.refreshToken
    )
    .map((c) => ({
      service: (c.connectionDefId as any).service as string,
      refreshToken: c.refreshToken as string,
    }));
};
