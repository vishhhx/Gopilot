import { Agent, handoff } from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import {
  listFormsTool,
  getFormTool,
  listResponsesTool,
  summarizeResponsesTool,
  createFormTool,
  addQuestionsTool,
  duplicateFormTool,
  updateFormInfoTool,
  updateQuestionTool,
  deleteQuestionTool,
  setAcceptingResponsesTool,
  trashFormTool,
} from "../tools/form";
import { z } from "zod";

// Field names match the Forms card in the chat UI.
const DynamicContentSchema = z.object({
  type: z.literal("form"),
  title: z.string(),
  url: z.string().nullable().describe("The form's editUrl; null once trashed."),
  metadata: z.object({
    formId: z.string(),
    formTitle: z.string(),
    responseId: z.string().nullable(),
    status: z
      .enum(["active", "closed", "unpublished"])
      .nullable()
      .describe("active = accepting responses, closed = not accepting, unpublished = not published."),
    questionCount: z.number().nullable(),
    responseCount: z.number().nullable(),
    operation: z.enum([
      "created",
      "read",
      "updated",
      "duplicated",
      "question_added",
      "question_removed",
      "response_viewed",
      "trashed",
    ]),
  }),
  data: z
    .object({
      shareableLink: z.string().nullable().describe("The form's responderUrl."),
      shortLink: z.string().nullable(),
      embedCode: z.string().nullable(),
      questions: z
        .array(
          z.object({
            id: z.string().describe("The question's itemId."),
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
- isDynamic: true when you return form data, false otherwise.
- One dynamicContent entry per form. Copy values from the tool result, never invent them:
  url = editUrl, data.shareableLink = responderUrl, shortLink and embedCode = null,
  metadata.status from isPublished/isAcceptingResponses, questionCount, data.questions from questions (id = itemId).
- content: a short summary that includes the share link (responderUrl) for created or duplicated forms, and the form id.
- If a tool returns success: false, say what failed using its error message. Never claim success without a successful tool result.
`;

const FORM_DESIGN_INSTRUCTIONS = `
DESIGNING FORMS:
- If the user doesn't specify questions ("anything", "a feedback form", "I'm testing"), write good ones yourself. Don't ask.
- Write real, specific questions for the form's purpose, never placeholders like "Question 1".
- Pick the type that fits: rating or linear_scale (1-5, with labels like "Poor"/"Excellent") for satisfaction,
  multiple_choice for one answer, checkboxes for several, dropdown for long lists, short_text for names/emails,
  paragraph for open feedback, date/time when asked for one.
- Give choice questions 3 to 6 clear options. Mark the essential questions required; keep open feedback optional.
- Use the number of questions the user asked for. Default to 5 if they didn't say.
- Give the form a clear title and a one-line description.
`;

/* --- Form agents (specialized by task) --- */

export const formReaderAgent = new Agent({
  name: "form-reader-agent",
  handoffDescription: "List and read forms, their questions and their responses.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Google Forms reader.
- Find forms with list_forms (use nameContains to search by title); read one with get_form.
- For responses use list_responses (individual answers) or summarize_responses (counts, averages, overview).
- If you're given a form title instead of an id, find the id with list_forms first.
- Responses can't be submitted or deleted through the API; say so if asked.
- Use operation "read" for forms and "response_viewed" for responses (set responseCount to the total).
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [listFormsTool, getFormTool, listResponsesTool, summarizeResponsesTool],
  outputType: AgentResponseSchema,
});

export const formCreatorAgent = new Agent({
  name: "form-creator-agent",
  handoffDescription: "Create new forms (with questions) and duplicate forms.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Google Forms builder.
- Create forms with create_form, sending every question in one call. The form is published automatically.
- Duplicate with duplicate_form (find the source id with list_forms if you only have a title).
- Use operation "created" or "duplicated".
${FORM_DESIGN_INSTRUCTIONS}
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [createFormTool, duplicateFormTool, listFormsTool],
  outputType: AgentResponseSchema,
});

export const formEditorAgent = new Agent({
  name: "form-editor-agent",
  handoffDescription: "Edit forms: title, description, questions, and opening/closing responses.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Google Forms editor.
- If you don't have the form id, find it with list_forms. Call get_form to see current questions and their itemIds before editing questions.
- update_form_info for title/description; add_questions, update_question, delete_question for questions;
  set_accepting_responses to open or close the form.
- Change only what was asked and keep everything else.
- Use operation "question_added", "question_removed" or "updated".
${FORM_DESIGN_INSTRUCTIONS}
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [
    listFormsTool,
    getFormTool,
    updateFormInfoTool,
    addQuestionsTool,
    updateQuestionTool,
    deleteQuestionTool,
    setAcceptingResponsesTool,
  ],
  outputType: AgentResponseSchema,
});

export const formDeleteAgent = new Agent({
  name: "form-delete-agent",
  handoffDescription: "Move forms to the Drive trash.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Google Forms delete agent.
- Find the form with list_forms or get_form. If several forms match the request, list them and ask which one; don't guess.
- trash_form moves it to Drive trash (restorable for 30 days). Tell the user that.
- Use operation "trashed" with url null.
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [listFormsTool, getFormTool, trashFormTool],
  outputType: AgentResponseSchema,
});

/* --- Coordinator and handoffs --- */
const formHandoffs = [
  handoff(formReaderAgent, {
    toolDescriptionOverride: "Default: list/search/read forms, questions and responses.",
  }),
  handoff(formCreatorAgent, {
    toolDescriptionOverride: "Create a new form or duplicate one.",
  }),
  handoff(formEditorAgent, {
    toolDescriptionOverride: "Edit a form's title, description, questions, or open/close responses.",
  }),
  handoff(formDeleteAgent, {
    toolDescriptionOverride: "Delete (move to trash) a form.",
  }),
];

export const formCoordinatorAgent = new Agent({
  name: "form-coordinator-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Google Forms coordinator (entry point). Hand off immediately:
- create / make / build a form, duplicate a form → creator
- change, rename, add/remove/edit questions, open/close a form → editor
- delete / remove a form → delete
- everything else (list, show, read, responses, results, summary) → reader
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [],
  handoffs: formHandoffs,
  outputType: AgentResponseSchema,
});

export default formCoordinatorAgent;
