import { Document, model, Schema, Types } from "mongoose";

export type RunStatus = "running" | "waiting_for_review" | "completed" | "failed" | "rejected";
export type StepStatus = "pending" | "running" | "done" | "failed" | "waiting" | "skipped";
export type StepKind = "Agent" | "Checker" | "HIL";

/** Encrypted text (see utils/crypto). Run inputs and step results can hold email contents. */
export interface Sealed {
  encrypted: string;
  iv: string;
  tag: string;
}

export interface RunStep {
  nodeId: string;
  kind: StepKind;
  label: string;
  service?: string;
  agentName?: string;
  /** the step's settings when the run started (see workflow/plan.ts) */
  task?: string;
  condition?: string;
  message?: string;
  status: StepStatus;
  /** { summary, data } for agents, { pass, reason } for checkers */
  result?: Sealed;
  error?: string;
  /** what the reviewer wrote when approving, or the answer to an agent's question */
  note?: string;
  /** an agent's question when it needs input from the user */
  question?: string;
  startedAt?: Date;
  finishedAt?: Date;
}

export interface WorkflowRunDocument extends Document {
  workflowId: Types.ObjectId;
  userId: Types.ObjectId;
  workflowTitle: string;
  status: RunStatus;
  inputs?: Sealed;
  timeZone: string;
  steps: RunStep[];
  currentStep: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SealedSchema = new Schema(
  { encrypted: String, iv: String, tag: String },
  { _id: false }
);

const RunStepSchema = new Schema(
  {
    nodeId: { type: String, required: true },
    kind: { type: String, enum: ["Agent", "Checker", "HIL"], required: true },
    label: { type: String, required: true },
    service: String,
    agentName: String,
    task: String,
    condition: String,
    message: String,
    status: {
      type: String,
      enum: ["pending", "running", "done", "failed", "waiting", "skipped"],
      default: "pending",
    },
    result: { type: SealedSchema, default: undefined },
    error: String,
    note: String,
    question: String,
    startedAt: Date,
    finishedAt: Date,
  },
  { _id: false }
);

const WorkflowRunSchema = new Schema<WorkflowRunDocument>(
  {
    workflowId: { type: Schema.Types.ObjectId, ref: "Workflows", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "Auth", required: true },
    workflowTitle: { type: String, default: "" },
    status: {
      type: String,
      enum: ["running", "waiting_for_review", "completed", "failed", "rejected"],
      default: "running",
    },
    inputs: { type: SealedSchema, default: undefined },
    timeZone: { type: String, default: "UTC" },
    steps: { type: [RunStepSchema], default: [] },
    currentStep: { type: Number, default: 0 },
    error: String,
  },
  { timestamps: true, collection: "workflow_runs" }
);

export const WorkflowRunModel = model<WorkflowRunDocument>("WorkflowRun", WorkflowRunSchema);
