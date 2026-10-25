import { axiosInstance } from "@/utils";
import type { ServiceId } from "@/lib/services";

export type InputFieldType =
  | "text"
  | "long_text"
  | "number"
  | "yes_no"
  | "select"
  | "date"
  | "time"
  | "datetime"
  | "email"
  | "email_list"
  | "url"
  | "spreadsheet"
  | "drive_file"
  | "drive_folder"
  | "form"
  | "gmail_label"
  | "calendar";

/** A value the user fills in each run; agent tasks refer to it as {{key}}. */
export interface InputField {
  key: string;
  label: string;
  type: InputFieldType;
  required: boolean;
  description?: string;
  /** choices for a "select" field */
  options?: string[];
}

export interface InputTypeInfo {
  value: InputFieldType;
  label: string;
  /** the app whose items the Run dialog lists for this type */
  service?: ServiceId;
}

export const INPUT_TYPES: InputTypeInfo[] = [
  { value: "text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "yes_no", label: "Yes or no" },
  { value: "select", label: "Choice from a list" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "datetime", label: "Date and time" },
  { value: "email", label: "Email address" },
  { value: "email_list", label: "Several email addresses" },
  { value: "url", label: "Link" },
  { value: "gmail_label", label: "Gmail label", service: "gmail" },
  { value: "spreadsheet", label: "Spreadsheet", service: "sheets" },
  { value: "calendar", label: "Calendar", service: "calendar" },
  { value: "drive_file", label: "Drive file", service: "drive" },
  { value: "drive_folder", label: "Drive folder", service: "drive" },
  { value: "form", label: "Google Form", service: "forms" },
];

export const PICKER_TYPES = new Set<InputFieldType>(["spreadsheet", "drive_file", "drive_folder", "form", "gmail_label", "calendar"]);

export const typeInfo = (type: InputFieldType) => INPUT_TYPES.find((t) => t.value === type) ?? INPUT_TYPES[0];

/** A picked item is stored as {"id","name"}; show its name. Other values show as typed. */
export const displayValue = (value?: string) => {
  if (!value?.startsWith("{")) return value;
  try {
    return (JSON.parse(value) as { name?: string }).name ?? value;
  } catch {
    return value;
  }
};

type Suggestion = Omit<InputField, "key" | "required"> & { required?: boolean };
const recipients: Suggestion = { label: "Recipients", type: "email_list" };
const spreadsheet: Suggestion = { label: "Spreadsheet", type: "spreadsheet" };
const range: Suggestion = { label: "Cell range", type: "text", description: "For example A1:D20, or a sheet tab name" };
const meetingStart: Suggestion = { label: "Start time", type: "datetime" };
const duration: Suggestion = { label: "Length in minutes", type: "number" };
const guests: Suggestion = { label: "Guests", type: "email_list", required: false };

/** Inputs each agent usually needs, offered in the step's settings as one-click additions. */
export const AGENT_INPUT_SUGGESTIONS: Record<string, Suggestion[]> = {
  gmailReaderAgent: [
    { label: "Search for", type: "text", description: "Words, a sender, or a subject" },
    { label: "From", type: "email", required: false },
    { label: "Label", type: "gmail_label", required: false },
  ],
  gmailWriterAgent: [recipients, { label: "Subject", type: "text" }, { label: "Message", type: "long_text", required: false }],
  gmailTrashAgent: [{ label: "Search for", type: "text" }, { label: "Label", type: "gmail_label", required: false }],
  gmailDeleteAgent: [{ label: "Search for", type: "text" }],
  sheetsReaderAgent: [spreadsheet, range],
  sheetsWriterAgent: [spreadsheet, range, { label: "Values to write", type: "long_text", required: false }],
  sheetsManagementAgent: [{ label: "Spreadsheet name", type: "text" }, { ...spreadsheet, required: false }],
  sheetsStructureAgent: [spreadsheet, { label: "Rows or columns", type: "text" }],
  sheetsFormattingAgent: [spreadsheet, range],
  sheetsHelperAgent: [spreadsheet, { label: "Value to find", type: "text" }],
  calendarReaderAgent: [{ label: "Date", type: "date" }, { label: "Calendar", type: "calendar", required: false }],
  calendarWriterAgent: [{ label: "Event title", type: "text" }, meetingStart, duration, guests],
  calendarDeleteAgent: [{ label: "Event date", type: "date" }, { label: "Event title", type: "text", required: false }],
  meetCreatorAgent: [{ label: "Meeting title", type: "text" }, meetingStart, duration, guests],
  meetReaderAgent: [{ label: "Date", type: "date" }],
  meetEditorAgent: [{ label: "Meeting date", type: "date" }, { label: "Guests to add", type: "email_list", required: false }],
  meetDeleteAgent: [{ label: "Meeting date", type: "date" }],
  driveReaderAgent: [{ label: "Folder", type: "drive_folder", required: false }, { label: "Search for", type: "text", required: false }],
  driveUploaderAgent: [{ label: "Folder", type: "drive_folder" }, { label: "File name", type: "text" }],
  driveSharerAgent: [
    { label: "File", type: "drive_file" },
    { label: "Share with", type: "email_list" },
    { label: "Access", type: "select", options: ["Viewer", "Commenter", "Editor"] },
  ],
  driveDeleteAgent: [{ label: "File", type: "drive_file" }],
  formCreatorAgent: [{ label: "Form topic", type: "text" }, { label: "Number of questions", type: "number", required: false }],
  formReaderAgent: [{ label: "Form", type: "form" }],
  formEditorAgent: [{ label: "Form", type: "form" }, { label: "Changes", type: "long_text" }],
  formDeleteAgent: [{ label: "Form", type: "form" }],
};

export const pickerApi = {
  list: async (kind: InputFieldType, q: string) => {
    const { data } = await axiosInstance.get(`/others/pickers/${kind}`, { params: { q } });
    return data.data.items as { id: string; name: string; hint?: string }[];
  },
};

/** The key the backend will give a field: lowercase words joined by underscores. */
export const fieldKey = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || "field";

/** Classes for an input chip inside a task (shared by the read-only view and the editor). */
export const chipClass = (kind: "input" | "value" | "missing") =>
  [
    "mx-0.5 inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-px align-baseline text-[0.92em] leading-snug font-medium whitespace-nowrap select-none",
    kind === "missing" ? "bg-danger-wash text-danger" : kind === "value" ? "bg-sage-wash text-sage-deep" : "bg-cornflower-wash text-cornflower-deep",
  ].join(" ");

/** Fields worth saving: named ones only, with keys matching their labels, options only on choices. */
export const cleanFields = (fields: InputField[]) =>
  fields
    .filter((f) => f.label.trim())
    .map(({ options, ...f }) => ({
      ...f,
      label: f.label.trim(),
      key: fieldKey(f.label),
      ...(f.type === "select" ? { options: (options ?? []).map((o) => o.trim()).filter(Boolean) } : {}),
    }));

export type RunStatus = "running" | "waiting_for_review" | "completed" | "failed" | "rejected";
export type StepStatus = "pending" | "running" | "done" | "failed" | "waiting" | "skipped";

export interface RunStep {
  nodeId: string;
  kind: "Agent" | "Checker" | "HIL";
  label: string;
  service: string | null;
  agentName: string | null;
  task: string | null;
  condition: string | null;
  message: string | null;
  status: StepStatus;
  summary: string | null;
  data: string | null;
  error: string | null;
  note: string | null;
  question: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowTitle: string;
  status: RunStatus;
  currentStep: number;
  error: string | null;
  inputs: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  steps: RunStep[];
}

export interface PlanIssue {
  nodeId?: string;
  message: string;
}

export interface PlanStep {
  nodeId: string;
  kind: "Agent" | "Checker" | "HIL";
  label: string;
  service?: string;
  agentName?: string;
  task?: string;
  condition?: string;
  message?: string;
}

export interface Plan {
  steps: PlanStep[];
  errors: PlanIssue[];
  warnings: PlanIssue[];
}

export const isActive = (run: WorkflowRun | null) => run?.status === "running" || run?.status === "waiting_for_review";

export const fillTemplate = (text: string, values: Record<string, string>) =>
  text.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, key: string) => displayValue(values[key]?.trim()) || match);

/** Validation problems in a 400 response, as one readable line. */
export function issuesMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string; data?: { issues?: PlanIssue[] } } }; message?: string };
  const issues = e?.response?.data?.data?.issues;
  if (issues?.length) return issues.map((i) => i.message).join(" ");
  return e?.response?.data?.message || e?.message || fallback;
}

/** A saved workflow as the chat's workflow picker needs it. */
export interface WorkflowSummary {
  _id: string;
  title?: string;
  description?: string;
  inputs?: InputField[];
  nodes?: { type?: string; data?: Record<string, unknown> | null }[];
  updatedAt?: string;
}

export const workflowApi = {
  list: async () => {
    const { data } = await axiosInstance.get("/workflow", { params: { pageSize: 100 } });
    return (data.data.workflows ?? []) as WorkflowSummary[];
  },
  /** Starts a workflow from a chat; returns the chat messages to show. */
  runInChat: async (sessionId: string, workflowId: string, inputs: Record<string, string>) => {
    const { data } = await axiosInstance.post(`/agent/chat/${encodeURIComponent(sessionId)}/workflow`, {
      workflowId,
      inputs,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    return data.data as { result: unknown; run: WorkflowRun; sessionId: string };
  },
  check: async (workflowId: string) => {
    const { data } = await axiosInstance.get(`/workflow/${workflowId}/check`);
    return data.data as Plan;
  },
  startRun: async (workflowId: string, inputs: Record<string, string>) => {
    const { data } = await axiosInstance.post(`/workflow/${workflowId}/runs`, {
      inputs,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    return data.data.run as WorkflowRun;
  },
  getRun: async (runId: string) => {
    const { data } = await axiosInstance.get(`/workflow/runs/${runId}`);
    return data.data.run as WorkflowRun;
  },
  latestRun: async (workflowId: string) => {
    const { data } = await axiosInstance.get(`/workflow/${workflowId}/runs`, { params: { limit: 1 } });
    return (data.data.runs as WorkflowRun[])[0] ?? null;
  },
  review: async (runId: string, approved: boolean, note: string) => {
    const { data } = await axiosInstance.post(`/workflow/runs/${runId}/review`, { approved, note });
    return data.data.run as WorkflowRun;
  },
};
