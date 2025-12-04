import { Document, model, Schema, Types } from "mongoose";

export interface EdgeType {
  id?: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  label?: string;
  data?: any;
}

export interface NodeType {
  id: string;
  type?: string;
  position?: { x: number; y: number };
  data?: any;
  measured?: { width?: number; height?: number } | null;
  selected?: boolean;
  dragging?: boolean;
}

export interface WorkflowDocument extends Document {
  userId: Types.ObjectId;
  title?: string;
  description?: string;
  nodes: NodeType[];
  edges: EdgeType[];
  isPublic: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PositionSchema = new Schema(
  {
    x: Number,
    y: Number,
  },
  { _id: false }
);

const MeasuredSchema = new Schema(
  {
    width: Number,
    height: Number,
  },
  { _id: false }
);

 const NodeSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String },
    position: { type: PositionSchema, default: undefined },
    data: { type: Schema.Types.Mixed, default: {} },
    measured: { type: MeasuredSchema, default: null },
    selected: { type: Boolean, default: false },
    dragging: { type: Boolean, default: false },
  },
  { _id: false }
);

const EdgeSchema = new Schema(
  {
    id: { type: String },
    source: { type: String, required: true },
    target: { type: String, required: true },
    type: { type: String },
    animated: { type: Boolean, default: false },
    label: { type: String },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);
const WorkflowSchema = new Schema<WorkflowDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Auth", required: true },

    title: { type: String },
    description: { type: String },

    nodes: { type: [NodeSchema], default: [] },
    edges: { type: [EdgeSchema], default: [] },

    isPublic: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const WorkflowModel = model<WorkflowDocument>(
  "Workflows",
  WorkflowSchema
);
