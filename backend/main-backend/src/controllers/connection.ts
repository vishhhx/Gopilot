import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "../utils";
import { ServiceConnection } from "../models/connect/serviceConnection";
import { ConnectionDefinition } from "../models/connect/connectionDefinition";
import { IConnectionDef, IServiceConnection } from "../types";
import { GoogleConnectApi } from "../utils/google/Connect";
import mongoose from "mongoose";
interface IScope {
  name: string;
  description: string;
  _id: string;
}

export const getAllServices = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.user;

    const userConnections = await ServiceConnection.find({ userId })
      .select("status scopes connectionDefId userId connectedScops")
      .populate("connectionDefId");
    console.log(userConnections, "user connections ");

    const allAvailableConnections = await ConnectionDefinition.find({
      isEnabled: true,
    }).lean();
    console.log(allAvailableConnections);
    const finalConnections = allAvailableConnections.map(
      (def: IConnectionDef) => {
        const userConn = userConnections.find((sc: IServiceConnection) => {
          const match =
            sc.connectionDefId._id?.toString() === def._id?.toString();
          console.log(match, `${sc.connectionDefId._id}===${def._id}`);
          return match;
        });
        console.log(userConn);
        if (userConn) {
          return {
            ...def,
            isConnected: true,
            status: userConn.status,
            connectedScopes: userConn.connectedScops || [],
          };
        }

        return {
          ...def,
          isConnected: false,
          status: "disconnected",
          connectedScopes: [],
        };
      }
    );

    return res.status(200).json({
      success: true,
      data: finalConnections,
    });
  }
);

export const addConnectionDef = asyncHandler(
  async (req: Request, res: Response) => {
    const connectionDefs: IConnectionDef[] = req.body;

    if (!Array.isArray(connectionDefs) || connectionDefs.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Request body must be a non-empty array of connection definitions.",
      });
    }

    const existing = await ConnectionDefinition.find({
      $or: connectionDefs.map((def) => ({
        provider: def.provider,
        service: def.service,
      })),
    }).select("provider service");

    const existingKeys = new Set(
      existing.map((e) => `${e.provider}:${e.service}`)
    );
    const newDefs = connectionDefs.filter(
      (def) => !existingKeys.has(`${def.provider}:${def.service}`)
    );

    if (newDefs.length === 0) {
      return res.status(200).json({
        success: false,
        message: "All provided connection definitions already exist.",
      });
    }

    const inserted = await ConnectionDefinition.insertMany(newDefs);

    return res.status(201).json({
      success: true,
      message: `${inserted.length} connection definition(s) added successfully.`,
      data: inserted,
    });
  }
);

export const GoogleServiceInt = asyncHandler(
  async (req: Request, res: Response) => {
    const { scopes, service } = req.body;
    console.log(scopes);

    //TODO:Enhance
    const scopeIds = scopes.map((s: string) => new mongoose.Types.ObjectId(s));
    const connectionDef = await ConnectionDefinition.aggregate([
      { $match: { service } },
      {
        $project: {
          provider: 1,
          service: 1,
          displayName: 1,
          scopes: {
            $filter: {
              input: "$scopes",
              as: "scope",
              cond: { $in: ["$$scope._id", scopeIds] },
            },
          },
        },
      },
    ]);

    //TODO : check whether the same scops present in the userConnections;

    if (!connectionDef.length) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No connection definition found"));
    }
    const connection = connectionDef[0];
    const scopeList = connection.scopes.map((s: IScope) => s.name);
    if (!scopeList.length) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "No valid scopes found in database"));
    }
    const googleApi = new GoogleConnectApi();
    const serviceUri = googleApi.getServiceConnectUrl(scopeList, service);
    if (!serviceUri) {
      return res
        .status(500)
        .json(
          new ApiResponse(500, null, "Failed to generate Google OAuth URL")
        );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, serviceUri, "Redirect to Google OAuth"));
  }
);
