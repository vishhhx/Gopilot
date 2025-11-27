import mongoose, { Schema } from "mongoose";
import { IConnectionDef } from "../../types";

const ConnectionDefinitionSchema = new Schema<IConnectionDef>(
  {
    provider: { type: String, required: true },
    service: { type: String, required: true },
    displayName: { type: String, required: true },
    description: { type: String },

    scopes: [
      {
        name: { type: String, required: true },
        description: { type: String, required: true },
      },
    ],
    iconUrl: {
      type: String,
      required: true,
    },
    authType: {
      type: String,
      enum: ["oauth2", "apiKey"],
      default: "oauth2",
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const ConnectionDefinition = mongoose.model<IConnectionDef>(
  "ConnectionDefinition",
  ConnectionDefinitionSchema
);
