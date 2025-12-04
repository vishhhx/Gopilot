import { tool, RunContext } from "@openai/agents";
import { z } from "zod";
import { FormAgentService } from "../utils/google/forms";

export interface Tokens {
  service: string;
  refreshToken: string;
}

function getRefreshToken(context: any) {
  console.log("🔍 Context received:", context);

  // If inside context.form array
  if (Array.isArray(context.form)) {
    const found = context.form.find((t) => t.service === "form");
    if (!found || !found.refreshToken) {
      throw new Error("No refresh token for form service found");
    }
    return found.refreshToken;
  }

  // If context.form is object
  if (context.form?.refreshToken) {
    return context.form.refreshToken;
  }

  throw new Error("No refresh token for form service found");
}


// ==================== LIST FORMS TOOLS ====================

export const listFormsTool = tool({
  name: "list_forms",
  description: `
Get a list of all forms.
Parameters:
- maxResults: Number of forms to return (1-500, default: 10)
- pageToken: Token for pagination or empty string ""
- status: Filter by form status (active, draft, archived)
- sortBy: Sort forms by (created, modified, name)
  `,
  parameters: z.object({
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(500)
      .describe("Number of forms to return"),
    pageToken: z.string().describe("Pagination token or empty string"),
    status: z
      .string()
      .describe("Filter by form status: active, draft, or archived"),
    sortBy: z
      .string()
      .describe("Sort forms by: created, modified, or name"),
  }),
  execute: async (
    { maxResults, pageToken, status, sortBy },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      const result = await formService.listForms({
        maxResults: maxResults || 10,
        pageToken: pageToken || undefined,
        status: status as "active" | "draft" | "archived" | undefined,
        sortBy: sortBy as "created" | "modified" | "name" | undefined,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error("Error listing forms:", error);
      return {
        success: false,
        error: error?.message || "Failed to list forms",
      };
    }
  },
});

export const listFormIdsTool = tool({
  name: "list_form_ids",
  description: `
Get only the form IDs using filters.
Parameters:
- maxResults: Number of forms to return (1-500, default: 10)
- pageToken: Token for pagination, default: ""
- status: Filter by status (active, draft, archived), default: "active"
  `,
  parameters: z.object({
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(500)
      .describe("Number of form IDs to return"),
    pageToken: z.string().describe("Pagination token or empty string"),
    status: z.string().describe("Filter by status: active, draft, or archived"),
  }),
  execute: async (
    { maxResults, pageToken, status },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      const result = await formService.listForms({
        maxResults: maxResults || 10,
        pageToken: pageToken || undefined,
        status: status as "active" | "draft" | "archived",
      });

      const ids = result.forms?.map((f) => f.id) || [];

      return {
        success: true,
        data: {
          ids,
          totalResults: result.totalResults || 0,
          nextPageToken: result.nextPageToken || null,
        },
      };
    } catch (err: any) {
      console.error("Error listing form IDs:", err);
      return {
        success: false,
        error: err?.message || "Failed to fetch form IDs",
      };
    }
  },
});

// ==================== CREATE FORM TOOLS ====================

export const createFormTool = tool({
  name: "create_form",
  description: `
Create a new form with questions.
Parameters:
- title: Form title (required)
- description: Form description (optional, use "" if not provided)
- questions: Array of question objects with title, type, required, options, etc.
- settings: Form settings like allowMultipleResponses, collectEmails, etc.
  `,
  parameters: z.object({
    title: z.string().min(1).describe("Form title"),
    description: z.string().describe("Form description or empty string"),
    questions: z
      .array(
        z.object({
          title: z.string().describe("Question text"),
          type: z.enum([
            "shortText",
            "longText",
            "multipleChoice",
            "checkbox",
            "dropdown",
            "rating",
            "date",
          ]).describe("Question type"),
          required: z.boolean().describe("Is question required"),
          options: z.array(z.string()).describe("Options for multiple choice questions or empty array"),
          placeholder: z.string().describe("Placeholder text or empty string"),
          description: z.string().describe("Question description or empty string"),
        })
      )
      .describe("Array of questions"),
    settings: z
      .object({
        allowMultipleResponses: z.boolean().describe("Allow multiple responses"),
        collectEmails: z.boolean().describe("Collect email addresses"),
        showProgress: z.boolean().describe("Show progress bar"),
        shuffleQuestions: z.boolean().describe("Shuffle question order"),
      })
      .describe("Form settings"),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      const result = await formService.createForm({
        title: args.title,
        description: args.description || "",
        questions: args.questions,
        settings: args.settings,
      });

      return {
        success: true,
        message: "Form created successfully",
        data: {
          id: result.id,
          title: result.title,
          shareableLink: result.shareableLink,
          shortLink: result.shortLink,
          embedCode: result.embedCode,
          createdAt: result.createdAt,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to create form",
      };
    }
  },
});

// ==================== READ FORM TOOLS ====================

export const getFormTool = tool({
  name: "get_form",
  description: "Get detailed information about a specific form by ID.",
  parameters: z.object({
    formId: z.string().min(1).describe("The form ID"),
  }),
  execute: async (
    { formId },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      const form = await formService.getForm(formId);

      return {
        success: true,
        data: form,
      };
    } catch (err: any) {
      console.error("get_form tool error:", err);
      return {
        success: false,
        error: err?.message || "Failed to get form.",
      };
    }
  },
});

// ==================== RESPONSES TOOLS ====================

export const listResponsesTool = tool({
  name: "list_responses",
  description: `
Get all responses for a form.
Parameters:
- formId: The form ID (required)
- maxResults: Number of responses to return (1-500, default: 10)
- pageToken: Pagination token or empty string ""
- sortBy: Sort responses by (newest, oldest)
  `,
  parameters: z.object({
    formId: z.string().min(1).describe("The form ID"),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(500)
      .describe("Number of responses to return"),
    pageToken: z.string().describe("Pagination token or empty string"),
    sortBy: z.string().describe("Sort order: newest or oldest"),
  }),
  execute: async (
    { formId, maxResults, pageToken, sortBy },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      const result = await formService.listResponses(formId, {
        maxResults: maxResults || 10,
        pageToken: pageToken || undefined,
        sortBy: sortBy as "newest" | "oldest",
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error("Error listing responses:", error);
      return {
        success: false,
        error: error?.message || "Failed to list responses",
      };
    }
  },
});

export const getResponseTool = tool({
  name: "get_response",
  description: "Get a specific response by ID.",
  parameters: z.object({
    formId: z.string().min(1).describe("The form ID"),
    responseId: z.string().min(1).describe("The response ID"),
  }),
  execute: async (
    { formId, responseId },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      const response = await formService.getResponse(formId, responseId);

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      console.error("Error getting response:", error);
      return {
        success: false,
        error: error?.message || "Failed to get response",
      };
    }
  },
});

export const submitResponseTool = tool({
  name: "submit_response",
  description: `
Submit a response to a form. This is for form filling.
Parameters:
- formId: The form ID (required)
- answers: Array of answers with questionId and value
- responderEmail: Email of person submitting (optional, use "" if not provided)
  `,
  parameters: z.object({
    formId: z.string().min(1).describe("The form ID"),
    answers: z
      .array(
        z.object({
          questionId: z.string().describe("The question ID"),
          value: z.union([z.string(), z.array(z.string()), z.number()]).describe("Answer value"),
        })
      )
      .describe("Array of answers"),
    responderEmail: z.string().describe("Email of responder or empty string"),
  }),
  execute: async (
    args: any,
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      const result = await formService.submitResponse(args.formId, {
        answers: args.answers,
        responderEmail: args.responderEmail || undefined,
      });

      return {
        success: true,
        message: "Response submitted successfully",
        data: {
          id: result.id,
          formId: result.formId,
          submittedAt: result.metadata?.submittedAt,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to submit response",
      };
    }
  },
});

// ==================== UPDATE FORM TOOLS ====================

export const updateFormTool = tool({
  name: "update_form",
  description: `
Update form details like title, description, questions, or status.
Parameters:
- formId: The form ID (required)
- title: New form title (optional, use "" to skip)
- description: New description (optional, use "" to skip)
- status: New status (active, draft, archived) (optional)
  `,
  parameters: z.object({
    formId: z.string().min(1).describe("The form ID"),
    title: z.string().describe("New form title or empty string"),
    description: z.string().describe("New description or empty string"),
    status: z.string().describe("New status: active, draft, or archived or empty string"),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      const result = await formService.updateForm(args.formId, {
        title: args.title || undefined,
        description: args.description || undefined,
        status: args.status || undefined,
      });

      return {
        success: true,
        message: "Form updated successfully",
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to update form",
      };
    }
  },
});

export const duplicateFormTool = tool({
  name: "duplicate_form",
  description: "Create a copy of an existing form with a new title.",
  parameters: z.object({
    formId: z.string().min(1).describe("The form ID to duplicate"),
    newTitle: z.string().min(1).describe("Title for the new form"),
  }),
  execute: async (
    { formId, newTitle },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      const result = await formService.duplicateForm(formId, newTitle);

      return {
        success: true,
        message: "Form duplicated successfully",
        data: {
          id: result.id,
          title: result.title,
          shareableLink: result.shareableLink,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to duplicate form",
      };
    }
  },
});

// ==================== FORM SETTINGS TOOLS ====================

export const addQuestionTool = tool({
  name: "add_question",
  description: "Add a new question to a form.",
  parameters: z.object({
    formId: z.string().min(1).describe("The form ID"),
    title: z.string().min(1).describe("Question text"),
    type: z.enum([
      "shortText",
      "longText",
      "multipleChoice",
      "checkbox",
      "dropdown",
      "rating",
      "date",
    ]).describe("Question type"),
    required: z.boolean().describe("Is question required"),
    options: z.array(z.string()).describe("Options for multiple choice questions or empty array"),
    placeholder: z.string().describe("Placeholder text or empty string"),
    description: z.string().describe("Question description or empty string"),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      const result = await formService.addQuestion(args.formId, {
        id: `q_${Date.now()}`,
        title: args.title,
        type: args.type,
        required: args.required,
        options: args.options || undefined,
        placeholder: args.placeholder || undefined,
        description: args.description || undefined,
      });

      return {
        success: true,
        message: "Question added successfully",
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to add question",
      };
    }
  },
});

export const removeQuestionTool = tool({
  name: "remove_question",
  description: "Remove a question from a form.",
  parameters: z.object({
    formId: z.string().min(1).describe("The form ID"),
    questionId: z.string().min(1).describe("The question ID to remove"),
  }),
  execute: async (
    { formId, questionId },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      await formService.removeQuestion(formId, questionId);

      return {
        success: true,
        message: "Question removed successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to remove question",
      };
    }
  },
});

// ==================== DELETE TOOLS ====================

export const deleteFormTool = tool({
  name: "delete_form",
  description: "PERMANENTLY delete a form. This action cannot be undone.",
  parameters: z.object({
    formId: z.string().min(1).describe("The form ID to delete"),
  }),
  needsApproval: true,
  execute: async (
    { formId },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      await formService.deleteForm(formId);

      return {
        success: true,
        message: "Form deleted permanently",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to delete form",
      };
    }
  },
});

export const deleteResponseTool = tool({
  name: "delete_response",
  description: "Delete a specific response.",
  parameters: z.object({
    formId: z.string().min(1).describe("The form ID"),
    responseId: z.string().min(1).describe("The response ID to delete"),
  }),
  needsApproval: true,
  execute: async (
    { formId, responseId },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      await formService.deleteResponse(formId, responseId);

      return {
        success: true,
        message: "Response deleted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to delete response",
      };
    }
  },
});

export const clearResponsesTool = tool({
  name: "clear_responses",
  description:
    "Delete ALL responses for a form. This action cannot be undone.",
  parameters: z.object({
    formId: z.string().min(1).describe("The form ID"),
  }),
  needsApproval: true,
  execute: async (
    { formId },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      const result = await formService.clearResponses(formId);

      return {
        success: true,
        message: result.message,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to clear responses",
      };
    }
  },
});

// ==================== ADVANCED TOOLS ====================

export const exportResponsesTool = tool({
  name: "export_responses",
  description: "Export all form responses in CSV or JSON format.",
  parameters: z.object({
    formId: z.string().min(1).describe("The form ID"),
    format: z.enum(["csv", "json"]).describe("Export format"),
  }),
  execute: async (
    { formId, format },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      const result = await formService.exportResponses(formId, format as "csv" | "json");

      return {
        success: true,
        message: `Responses exported as ${format}`,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to export responses",
      };
    }
  },
});

export const getAnalyticsTool = tool({
  name: "get_analytics",
  description: "Get analytics for a form including response count and insights.",
  parameters: z.object({
    formId: z.string().min(1).describe("The form ID"),
  }),
  execute: async (
    { formId },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const formService = new FormAgentService(refreshToken);
      const analytics = await formService.generateAnalytics(formId);

      return {
        success: true,
        data: analytics,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get analytics",
      };
    }
  },
});