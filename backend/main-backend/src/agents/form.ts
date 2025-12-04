import { Agent, handoff } from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import {
  listFormsTool,
  listFormIdsTool,
  getFormTool,
  createFormTool,
  updateFormTool,
  duplicateFormTool,
  addQuestionTool,
  removeQuestionTool,
  submitResponseTool,
  listResponsesTool,
  getResponseTool,
  deleteFormTool,
  deleteResponseTool,
  clearResponsesTool,
  exportResponsesTool,
  getAnalyticsTool,
} from "../tools/form";
import { sheetsCoordinatorAgent } from "./orchestrator";
import { z } from "zod";

const DynamicContentSchema = z.object({
  type: z.literal("form"),
  title: z.string(),
  url: z.string().nullable(),
  metadata: z.object({
    formId: z.string(),
    formTitle: z.string(),
    responseId: z.string().nullable(),
    status: z.enum(["active", "draft", "archived"]).nullable(),
    questionCount: z.number().nullable(),
    responseCount: z.number().nullable(),
    operation: z.enum([
      "created",
      "read",
      "updated",
      "duplicated",
      "question_added",
      "question_removed",
      "response_submitted",
      "response_viewed",
      "responses_exported",
      "deleted",
      "response_deleted",
      "responses_cleared",
    ]),
  }),
  data: z
    .object({
      shareableLink: z.string().nullable(),
      shortLink: z.string().nullable(),
      embedCode: z.string().nullable(),
      questions: z
        .array(
          z.object({
            id: z.string(),
            title: z.string(),
            type: z.string(),
          })
        )
        .nullable(),
      responses: z
        .array(
          z.object({
            id: z.string(),
            formId: z.string(),
          })
        )
        .nullable(),
      analytics: z
        .object({
          totalResponses: z.number().nullable(),
          completionRate: z.number().nullable(),
        })
        .nullable(),
    })
    .nullable(),
});

const AgentResponseSchema = z.object({
  isDynamic: z.boolean(),
  content: z.string(),
  dynamicContent: z.array(DynamicContentSchema).nullable(),
});

const RESPONSE_FORMAT_INSTRUCTIONS = `
RESPONSE FORMAT:
- isDynamic: true for Form data, false otherwise
- One dynamicContent entry per form/operation (multiple for bulk)
- Always include formId, formTitle, operation; url=null if deleted
- Include shareableLink, shortLink for created/duplicated forms
- content: human-readable summary
`;

/* --- Form Agents (specialized by task) --- */

export const formReaderAgent = new Agent({
  name: "form-reader-agent",
  handoffDescription: "List, search, and read forms and responses.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Form reader.
- List forms by status (active, draft, archived)
- Get form details including questions
- List/read responses for a form
- Show analytics for forms
- Return structured summaries (id, title, status, questionCount, responseCount)
- If user wants actions after listing (delete/edit/etc.), present results then hand off
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [
    listFormsTool,
    listFormIdsTool,
    getFormTool,
    listResponsesTool,
    getResponseTool,
    getAnalyticsTool,
  ],
  outputType: AgentResponseSchema,
});

export const formCreatorAgent = new Agent({
  name: "form-creator-agent",
  handoffDescription: "Create new forms and add/remove questions.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Form creator.
- Create new forms with title, description, and questions
- Add questions to existing forms
- Remove questions from forms
- Duplicate existing forms
- Generate and return shareable links, short links, and embed codes
- Ask for confirmation if creating forms with many questions (>10)
- Use operation "created" for new forms, "duplicated" for copies, "question_added"/"question_removed" for modifications
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [
    createFormTool,
    addQuestionTool,
    removeQuestionTool,
    duplicateFormTool,
  ],
  outputType: AgentResponseSchema,
});

export const formResponseAgent = new Agent({
  name: "form-response-agent",
  handoffDescription: "Submit form responses, view, and export response data.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Form response handler.
- Submit responses to forms
- View individual responses
- List all responses for a form
- Export responses in CSV or JSON format
- Generate analytics for forms
- For bulk exports (>100 responses) ask for confirmation
- Use operation "response_submitted" for submissions, "responses_exported" for exports
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [
    submitResponseTool,
    listResponsesTool,
    getResponseTool,
    exportResponsesTool,
    getAnalyticsTool,
  ],
  outputType: AgentResponseSchema,
});

export const formEditorAgent = new Agent({
  name: "form-editor-agent",
  handoffDescription: "Edit form properties, title, status, and structure.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Form editor.
- Update form title, description, and settings
- Change form status (active, draft, archived)
- Modify form structure
- For status changes ask for confirmation if form has responses
- Use operation "updated" for all edits
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [updateFormTool],
  outputType: AgentResponseSchema,
});

export const formDeleteAgent = new Agent({
  name: "form-delete-agent",
  handoffDescription:
    "Delete forms and responses (requires explicit confirmation).",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Form permanent-delete agent.
CRITICAL:
- NEVER delete without explicit confirmation: allowed confirmations: "YES DELETE PERMANENTLY", "DELETE FOREVER", "CONFIRM PERMANENT DELETION"
- If confirmation not exact, present warning and ask again
- For forms with responses, warn user that all responses will be deleted
- For clearing all responses, ask for explicit confirmation
Process:
1) Expect form/response IDs from previous agent
2) If explicit confirmation -> delete; else ask again
After deletion: set isDynamic:true with operation:"deleted"/"response_deleted"/"responses_cleared" and url:null
Before deletion (confirm stage): set isDynamic:false
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [deleteFormTool, deleteResponseTool, clearResponsesTool],
  outputType: AgentResponseSchema,
});

/* --- Coordinator and handoffs --- */
const formHandoffs = [
  handoff(formReaderAgent, {
    toolDescriptionOverride: "Default: list/search/read forms and responses.",
  }),
  handoff(formCreatorAgent, {
    toolDescriptionOverride: "Create forms, add/remove questions, duplicate.",
  }),
  handoff(formEditorAgent, {
    toolDescriptionOverride: "Edit form properties and status.",
  }),
  handoff(formResponseAgent, {
    toolDescriptionOverride: "Submit/view/export responses and analytics.",
  }),
  handoff(formDeleteAgent, {
    toolDescriptionOverride:
      "Permanent deletion ONLY with explicit phrases like 'delete permanently' or 'erase permanently'.",
  }),
];

export const formCoordinatorAgent = new Agent({
  name: "form-coordinator-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Form coordinator (entry point).
- Route to reader (default for view/list/search forms and responses)
- Route to creator for new forms, duplicating, or adding questions
- Route to editor for updating form properties and status
- Route to response-handler for submitting/exporting/viewing responses
- Route to delete ONLY for explicit permanent-delete confirmations
- For cross-service workflows with Sheets, route to Sheets coordinator
- For "create a form"/"new form" → creator
- For "show my forms"/"list forms" → reader
- For "submit response" → response-handler
- For "delete form" or "find and delete" → reader first (so user can review)
Default to reader if unclear.
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [],
  handoffs: [
    ...formHandoffs,
    handoff(sheetsCoordinatorAgent, {
      toolDescriptionOverride: "Forms → Sheets cross-service workflows.",
    }),
  ],
  outputType: AgentResponseSchema,
});

/* --- Internal agent handoffs (cross-routing) --- */

formReaderAgent.handoffs = [
  handoff(formEditorAgent, {
    toolDescriptionOverride: "Edit form properties after viewing.",
  }),
  handoff(formCreatorAgent, {
    toolDescriptionOverride: "Duplicate or create similar form.",
  }),
  handoff(formResponseAgent, {
    toolDescriptionOverride: "View or export responses.",
  }),
  handoff(formDeleteAgent, {
    toolDescriptionOverride:
      "Permanent delete ONLY with explicit confirmation phrases.",
  }),
];

formCreatorAgent.handoffs = [
  handoff(formReaderAgent, {
    toolDescriptionOverride: "View created form or check existing forms.",
  }),
  handoff(formEditorAgent, {
    toolDescriptionOverride: "Edit form after creation.",
  }),
];

formResponseAgent.handoffs = [
  handoff(formReaderAgent, {
    toolDescriptionOverride: "Return to reader to verify responses.",
  }),
  handoff(formDeleteAgent, {
    toolDescriptionOverride: "Delete responses if requested.",
  }),
];

formEditorAgent.handoffs = [
  handoff(formReaderAgent, {
    toolDescriptionOverride: "View updated form.",
  }),
  handoff(formDeleteAgent, {
    toolDescriptionOverride: "Delete form if user changes mind.",
  }),
];

formDeleteAgent.handoffs = [
  handoff(formReaderAgent, {
    toolDescriptionOverride: "Verify deletion results if requested.",
  }),
  handoff(formEditorAgent, {
    toolDescriptionOverride: "Switch to edit if user changes mind.",
  }),
];

export default formCoordinatorAgent;
