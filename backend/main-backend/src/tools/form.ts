import { tool, RunContext } from "@openai/agents";
import { z } from "zod";
import { FormsService, QuestionInput } from "../utils/google/forms";

export interface Tokens {
  service: string;
  refreshToken: string;
}

function getRefreshToken(context: unknown) {
  // Chat runs pass the token list itself as context.
  const tokens: Tokens[] = Array.isArray(context)
    ? context
    : Array.isArray((context as { form?: unknown })?.form)
      ? (context as { form: Tokens[] }).form
      : [];
  const found = tokens.find((t) => t.service === "form" || t.service === "forms");
  if (!found?.refreshToken) {
    throw new Error("Google Forms isn't connected. Connect it in Settings > Connected apps.");
  }
  return found.refreshToken;
}

/** Runs a Forms call with the user's token and turns errors into a message the agent can act on. */
const withForms = async <T>(runContext: RunContext<unknown> | undefined, fn: (forms: FormsService) => Promise<T>) => {
  try {
    const forms = new FormsService(getRefreshToken(runContext?.context));
    return { success: true, data: await fn(forms) };
  } catch (error: any) {
    const status = error?.code ?? error?.response?.status;
    const message =
      status === 403
        ? `Google refused this (${error?.message}). The Forms connection may be missing a permission: reconnect Google Forms in Settings > Connected apps and grant all permissions.`
        : status === 404
          ? "No form with that id. List the forms to find the right one."
          : error?.message || "Google Forms request failed";
    console.error("[forms tool]", message);
    return { success: false, error: message };
  }
};

const QuestionSchema = z.object({
  title: z.string().min(1).describe("The question as the respondent sees it."),
  type: z
    .enum(["short_text", "paragraph", "multiple_choice", "checkboxes", "dropdown", "linear_scale", "rating", "date", "time"])
    .describe("short_text: one line. paragraph: long answer. linear_scale: e.g. 1-5. rating: stars."),
  required: z.boolean(),
  description: z.string().nullable().describe("Help text under the question, or null."),
  options: z
    .array(z.string())
    .nullable()
    .describe("Choices for multiple_choice, checkboxes and dropdown (at least 2). null for other types."),
  scale: z
    .object({
      low: z.number().int().describe("0 or 1"),
      high: z.number().int().describe("2 to 10. For rating, the number of stars (3 to 10)."),
      lowLabel: z.string().nullable(),
      highLabel: z.string().nullable(),
    })
    .nullable()
    .describe("For linear_scale and rating, else null."),
});

const FormIdSchema = z.string().min(1).describe("The Google Form id (from list_forms or an earlier result).");

// ==================== READ ====================

export const listFormsTool = tool({
  name: "list_forms",
  description: "List the user's Google Forms, newest first. Use to find a form's id by its title.",
  parameters: z.object({
    nameContains: z.string().nullable().describe("Only forms whose title contains this text, or null for all."),
    maxResults: z.number().int().min(1).max(100).describe("How many to return; 20 if unsure."),
  }),
  execute: (args, runContext?: RunContext<unknown>) =>
    withForms(runContext, (forms) => forms.listForms(args)),
});

export const getFormTool = tool({
  name: "get_form",
  description:
    "Get a form's title, description, questions (with itemIds, types and options), publish state, editUrl and responderUrl (the share link).",
  parameters: z.object({ formId: FormIdSchema }),
  execute: ({ formId }, runContext?: RunContext<unknown>) =>
    withForms(runContext, (forms) => forms.getForm(formId)),
});

export const listResponsesTool = tool({
  name: "list_responses",
  description: "List a form's responses, newest first, with each answer labelled by its question.",
  parameters: z.object({
    formId: FormIdSchema,
    limit: z.number().int().min(1).max(200).describe("How many responses to return; 20 if unsure."),
  }),
  execute: ({ formId, limit }, runContext?: RunContext<unknown>) =>
    withForms(runContext, (forms) => forms.listResponses(formId, limit)),
});

export const summarizeResponsesTool = tool({
  name: "summarize_responses",
  description:
    "Summarize all responses to a form: total count, answer counts per choice, averages for scales and ratings, sample text answers.",
  parameters: z.object({ formId: FormIdSchema }),
  execute: ({ formId }, runContext?: RunContext<unknown>) =>
    withForms(runContext, (forms) => forms.summarizeResponses(formId)),
});

// ==================== CREATE ====================

export const createFormTool = tool({
  name: "create_form",
  description:
    "Create a Google Form with its questions and publish it. Returns editUrl (for the owner) and responderUrl (the link to share).",
  parameters: z.object({
    title: z.string().min(1),
    description: z.string().nullable().describe("Shown under the title, or null."),
    questions: z.array(QuestionSchema).min(1).max(50),
  }),
  execute: (args, runContext?: RunContext<unknown>) =>
    withForms(runContext, (forms) => forms.createForm({ ...args, questions: args.questions as QuestionInput[] })),
});

export const addQuestionsTool = tool({
  name: "add_questions",
  description: "Add questions to an existing form, at a position or at the end.",
  parameters: z.object({
    formId: FormIdSchema,
    questions: z.array(QuestionSchema).min(1).max(50),
    position: z.number().int().min(0).nullable().describe("0-based position to insert at, or null for the end."),
  }),
  execute: ({ formId, questions, position }, runContext?: RunContext<unknown>) =>
    withForms(runContext, (forms) => forms.addQuestions(formId, questions as QuestionInput[], position)),
});

export const duplicateFormTool = tool({
  name: "duplicate_form",
  description: "Copy a form (questions and settings, no responses) under a new title, published.",
  parameters: z.object({ formId: FormIdSchema, title: z.string().min(1) }),
  execute: ({ formId, title }, runContext?: RunContext<unknown>) =>
    withForms(runContext, (forms) => forms.duplicateForm(formId, title)),
});

// ==================== EDIT ====================

export const updateFormInfoTool = tool({
  name: "update_form_info",
  description: "Change a form's title and/or description.",
  parameters: z.object({
    formId: FormIdSchema,
    title: z.string().nullable().describe("New title, or null to keep."),
    description: z.string().nullable().describe("New description, or null to keep."),
  }),
  execute: ({ formId, ...changes }, runContext?: RunContext<unknown>) =>
    withForms(runContext, (forms) => forms.updateInfo(formId, changes)),
});

export const updateQuestionTool = tool({
  name: "update_question",
  description:
    "Edit one question (find its itemId with get_form). Pass null for anything that should stay the same.",
  parameters: z.object({
    formId: FormIdSchema,
    itemId: z.string().min(1),
    title: z.string().nullable(),
    description: z.string().nullable(),
    required: z.boolean().nullable(),
    options: z.array(z.string()).nullable().describe("Replace all choices (choice questions only), or null."),
  }),
  execute: ({ formId, itemId, ...changes }, runContext?: RunContext<unknown>) =>
    withForms(runContext, (forms) => forms.updateQuestion(formId, itemId, changes)),
});

export const deleteQuestionTool = tool({
  name: "delete_question",
  description: "Remove one question from a form (find its itemId with get_form).",
  parameters: z.object({ formId: FormIdSchema, itemId: z.string().min(1) }),
  execute: ({ formId, itemId }, runContext?: RunContext<unknown>) =>
    withForms(runContext, (forms) => forms.deleteQuestion(formId, itemId)),
});

export const setAcceptingResponsesTool = tool({
  name: "set_accepting_responses",
  description: "Open or close a form for responses (closing keeps the form and its responses).",
  parameters: z.object({ formId: FormIdSchema, accepting: z.boolean() }),
  execute: ({ formId, accepting }, runContext?: RunContext<unknown>) =>
    withForms(runContext, async (forms) => {
      await forms.setPublishState(formId, { isPublished: true, isAcceptingResponses: accepting });
      return forms.getForm(formId);
    }),
});

// ==================== DELETE ====================

export const trashFormTool = tool({
  name: "trash_form",
  description: "Move a form to the user's Drive trash. It can be restored from Drive for 30 days.",
  parameters: z.object({ formId: FormIdSchema }),
  execute: ({ formId }, runContext?: RunContext<unknown>) =>
    withForms(runContext, (forms) => forms.trashForm(formId)),
});
