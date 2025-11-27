import mongoose, { Schema } from "mongoose";
import { IServiceConnection } from "../../types";

const ServiceConnectionSchema = new Schema<IServiceConnection>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    connectionDefId: {
      type: Schema.Types.ObjectId,
      ref: "ConnectionDefinition",
      required: true,
    },

    connectedScops: [{ type: String }],
    accessToken: { type: String },

    refreshToken: { type: String },

    expiresAt: { type: Date ,required:false},

    status: {
      type: String,
      enum: ["connected", "disconnected", "error"],
      default: "connected",
    },
  },
  { timestamps: true }
);

export const ServiceConnection = mongoose.model<IServiceConnection>(
  "ServiceConnection",
  ServiceConnectionSchema
);
