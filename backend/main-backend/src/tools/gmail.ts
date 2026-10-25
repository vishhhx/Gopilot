import { tool, RunContext } from "@openai/agents";
import { z } from "zod";
import { GmailService } from "../utils/google/gmail";
export interface Tokens {
  service: string;
  refreshToken: string;
}

function getrefresToken(tokens: Tokens[]) {
  const res = tokens.filter((token) => token.service === "gmail");
  if (res.length <= 0) {
    throw new Error("no refresh token of the gmail found");
  }
  return res[0].refreshToken;
}

export const listEmailsTool = tool({
  name: "list_emails",
  description: `
Get a list of emails from Gmail. 
Parameters:
- maxResults: Number of emails to return (1-500, default: 10). Always provide this, use 10 if not specified.
- pageToken: Token for pagination. Use empty string "" if no pagination needed.
- query: Gmail search query. Use empty string "" if no specific query.
- labelIds: Array of label IDs to filter by. Use empty array [] if no labels specified.
- includeSpamTrash: Whether to include spam and trash folders. Use true when querying SPAM or TRASH labels, false otherwise.
  `,
  parameters: z.object({
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(500)
      .describe("Number of emails to return"),
    pageToken: z.string().describe("Pagination token or empty string"),
    query: z.string().describe("Gmail search query or empty string"),
    labelIds: z.array(z.string()).describe("Array of label IDs or empty array"),
    includeSpamTrash: z.boolean().describe("Include spam and trash folders"),
  }),
  execute: async (
    { includeSpamTrash, labelIds, maxResults, pageToken, query },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the gmail found");
      }
      const refreshToken = getrefresToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }
      const gmail = new GmailService(refreshToken);

      const normalizedLabelIds =
        labelIds?.length > 0
          ? labelIds.map((label) => label.toUpperCase())
          : undefined;

      const result = await gmail.listMessages({
        maxResults: maxResults || 10,
        pageToken: pageToken || undefined,
        q: query || undefined,
        labelIds: normalizedLabelIds,
        includeSpamTrash: includeSpamTrash,
      });

      if (!result.messages || result.messages.length === 0) {
        return {
          success: true,
          message: "No emails found matching the criteria",
          data: {
            messages: [],
            resultSizeEstimate: 0,
            nextPageToken: null,
          },
        };
      }

      const detailedMessages = await Promise.all(
        result.messages.map(async (msg) => {
          try {
            const fullMsg = await gmail.getMessage(msg.id!, "metadata");
            const headers = fullMsg.payload?.headers || [];

            const getHeader = (name: string) =>
              headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
                ?.value || "N/A";

            return {
              id: fullMsg.id,
              threadId: fullMsg.threadId,
              labelIds: fullMsg.labelIds,
              snippet: fullMsg.snippet,
              from: getHeader("from"),
              to: getHeader("to"),
              subject: getHeader("subject"),
              date: getHeader("date"),
              internalDate: fullMsg.internalDate,
              sizeEstimate: fullMsg.sizeEstimate,
            };
          } catch (msgError: any) {
            console.error(
              `Failed to fetch message ${msg.id}:`,
              msgError?.message
            );
            return {
              id: msg.id,
              error: `Failed to fetch details: ${msgError?.message}`,
            };
          }
        })
      );

      return {
        success: true,
        data: {
          messages: detailedMessages,
          resultSizeEstimate: result.resultSizeEstimate,
          nextPageToken: result.nextPageToken,
        },
      };
    } catch (error: any) {
      console.error("Error listing emails:", error);
      return {
        success: false,
        error: error?.message || "Failed to list emails",
        details: error?.stack,
      };
    }
  },
});

export const listEmailIdsTool = tool({
  name: "list_email_ids",
  description: `
Get only the Gmail email IDs using filters.

Parameters (ALL required, even if empty — use defaults):
- maxResults: Number of emails to return (1-500, default: 10)
- pageToken: Token for pagination, default: ""
- query: Gmail search query, default: ""
- labelIds: Array of Gmail label IDs, default: []
- includeSpamTrash: Include spam + trash (true/false)
  `,
  parameters: z.object({
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(500)
      .describe("Number of email IDs to return"),
    pageToken: z.string().describe("Pagination token or empty string"),
    query: z.string().describe("Gmail search query or empty string"),
    labelIds: z.array(z.string()).describe("Array of label IDs or empty array"),
    includeSpamTrash: z.boolean().describe("Include spam and trash folders"),
  }),
  execute: async (
    { maxResults, pageToken, query, labelIds, includeSpamTrash },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the gmail found");
      }
      const refreshToken = getrefresToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }
      const gmail = new GmailService(refreshToken);

      const normalizedLabelIds =
        labelIds?.length > 0 ? labelIds.map((l) => l.toUpperCase()) : undefined;

      const result = await gmail.listMessages({
        maxResults: maxResults || 10,
        pageToken: pageToken || undefined,
        q: query || undefined,
        labelIds: normalizedLabelIds,
        includeSpamTrash: includeSpamTrash,
      });

      const ids = result?.messages?.map((m) => m.id) || [];

      return {
        success: true,
        data: {
          ids,
          resultSizeEstimate: result?.resultSizeEstimate || 0,
          nextPageToken: result?.nextPageToken || null,
        },
      };
    } catch (err: any) {
      console.error("Error listing email IDs:", err);
      return {
        success: false,
        error: err?.message || "Failed to fetch email IDs",
        details: err?.stack,
      };
    }
  },
});

export const readEmailTool = tool({
  name: "read_email",
  description: "Get the full content of an email by its ID.",
  parameters: z.object({
    emailId: z.string().describe("The Gmail message ID to read."),
    format: z
      .enum(["full", "minimal", "raw"])
      .describe(
        "Format: 'full' for complete message, 'minimal' for headers/snippet, 'raw' for RFC-2822 base64 content."
      ),
  }),
  execute: async (
    params: { emailId: string; format: "full" | "minimal" | "raw" },
    runContext?: RunContext<Tokens[]>
  ) => {
    const { emailId, format } = params;
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the gmail found");
      }
      const refreshToken = getrefresToken(runContext.context);
      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }
      const gmail = new GmailService(refreshToken);
      const message = await gmail.getMessage(emailId, format);
      return {
        success: true,
        data: message,
      };
    } catch (err: any) {
      console.error("read_email tool error:", err);

      return {
        success: false,
        error: err?.message || "Failed to read email.",
      };
    }
  },
});

export const sendEmailTool = tool({
  name: "send_email",
  description:
    "Send a new email. Write HTML (isHtml: true) for anything with structure such as schedules, lists or tables; Gmail renders it formatted. Plain text only for a one-line note.",
  parameters: z.object({
    to: z.array(z.string().email()).min(1).describe("Recipient email addresses."),
    subject: z
      .string()
      .min(1)
      .describe("A specific subject line, e.g. 'Your schedule for Mon 27 Oct'. Never empty."),
    body: z
      .string()
      .min(1)
      .describe(
        "The email body. When isHtml is true: an email-safe HTML fragment with inline styles (no <style>, <script> or markdown)."
      ),
    isHtml: z.boolean().describe("true when body is HTML."),
    cc: z.array(z.string().email()).nullable().describe("CC addresses, or null."),
    bcc: z.array(z.string().email()).nullable().describe("BCC addresses, or null."),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the gmail found");
      }
      const refreshToken = getrefresToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }
      const gmail = new GmailService(refreshToken);
      const emailData = {
        to: args.to,
        subject: args.subject,
        body: args.body,
        cc: args.cc ?? undefined,
        bcc: args.bcc ?? undefined,
        isHtml: args.isHtml ?? false,
      };
      const result = await gmail.sendEmail(emailData);

      return {
        success: true,
        message: `Email sent successfully to ${
          Array.isArray(args.to) ? args.to.join(", ") : args.to
        }`,
        data: {
          id: result.id,
          threadId: result.threadId,
          labelIds: result.labelIds,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }
  },
});
export const forwardEmailTool = tool({
  name: "forward_email",
  description:
    "Forward an existing email to other recipients. Required: messageId (string), to (email string or array). Optional: body (additional message string), cc (email string or array), bcc (email string or array).",
  parameters: z.object({
    messageId: z.string().min(1),
    to: z.union([z.string().email(), z.array(z.string().email())]),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the gmail found");
      }
      const refreshToken = getrefresToken(runContext.context);
      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }
      const gmail = new GmailService(refreshToken);
      const forwardData = {
        messageId: args.messageId,
        to: args.to,
        body: args.body,
        cc: args.cc,
        bcc: args.bcc,
      };
      const result = await gmail.forwardEmail(forwardData);

      return {
        success: true,
        message: `Email forwarded successfully to ${
          Array.isArray(args.to) ? args.to.join(", ") : args.to
        }`,
        data: {
          id: result.id,
          threadId: result.threadId,
          labelIds: result.labelIds,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to forward email",
      };
    }
  },
});

export const replyToEmailTool = tool({
  name: "reply_to_email",
  description:
    "Reply to an existing email. Automatically handles threading and includes original message references. Use HTML (isHtml: true) for structured replies.",
  parameters: z.object({
    messageId: z.string().min(1),
    body: z
      .string()
      .min(1)
      .describe("The reply body; an email-safe HTML fragment with inline styles when isHtml is true."),
    isHtml: z.boolean().describe("true when body is HTML."),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the gmail found");
      }
      const refreshToken = getrefresToken(runContext.context);
      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }
      const gmail = new GmailService(refreshToken);
      const replyData = {
        messageId: args.messageId,
        body: args.body,
        isHtml: args.isHtml ?? false,
      };
      const result = await gmail.replyToEmail(replyData);

      return {
        success: true,
        message: "Reply sent successfully",
        data: {
          id: result.id,
          threadId: result.threadId,
          labelIds: result.labelIds,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to send reply",
      };
    }
  },
});
export const batchDeleteEmailsTool = tool({
  name: "batch_delete_emails",
  description:
    "PERMANENTLY delete multiple emails at once. This action cannot be undone.",
  needsApproval: true,
  parameters: z.object({
    messageIds: z.array(z.string()).min(1),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the gmail found");
      }
      const refreshToken = getrefresToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }
      const gmail = new GmailService(refreshToken);
      await gmail.batchDeleteMessages(args.messageIds);
      return {
        success: true,
        message: `Successfully deleted ${args.messageIds.length} emails permanently`,
        data: { count: args.messageIds.length },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to batch delete emails",
      };
    }
  },
});

export const deleteEmailTool = tool({
  name: "delete_email",
  description:
    "PERMANENTLY delete an email. This action cannot be undone. Use trash_email for recoverable deletion.",
  parameters: z.object({
    messageId: z.string().min(1),
  }),
  needsApproval: true,
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the gmail found");
      }
      const refreshToken = getrefresToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }
      const gmail = new GmailService(refreshToken);
      await gmail.deleteMessage(args.messageId);
      return { success: true, message: "Email permanently deleted" };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to delete email",
      };
    }
  },
});

export const trashEmailTool = tool({
  name: "trash_email",
  description:
    "Move an email to trash. Can be restored later. Use delete_email for permanent deletion.",
  parameters: z.object({
    messageId: z.string().min(1),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the gmail found");
      }
      const refreshToken = getrefresToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }
      const gmail = new GmailService(refreshToken);
      await gmail.trashMessage(args.messageId);
      return { success: true, message: "Email moved to trash" };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to trash email",
      };
    }
  },
});

export const untrashEmailTool = tool({
  name: "untrash_email",
  description: "Restore an email from trash.",
  parameters: z.object({
    messageId: z.string().min(1),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the gmail found");
      }
      const refreshToken = getrefresToken(runContext.context);
      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }
      const gmail = new GmailService(refreshToken);
      await gmail.untrashMessage(args.messageId);
      return { success: true, message: "Email restored from trash" };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to restore email",
      };
    }
  },
});

export const markAsSpamTool = tool({
  name: "mark_as_spam",
  description: "Mark an email as spam. Moves to spam folder.",
  parameters: z.object({
    messageId: z.string().min(1),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the gmail found");
      }
      const refreshToken = getrefresToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }
      const gmail = new GmailService(refreshToken);
      await gmail.markAsSpam(args.messageId);
      return { success: true, message: "Email marked as spam" };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to mark as spam",
      };
    }
  },
});
export const archiveEmailTool = tool({
  name: "archive_email",
  description:
    "Archive an email (remove from inbox). Removes INBOX label but keeps the email accessible.",
  parameters: z.object({
    messageId: z.string().min(1),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the gmail found");
      }
      const refreshToken = getrefresToken(runContext.context);
      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }
      const gmail = new GmailService(refreshToken);
      await gmail.archiveMessage(args.messageId);
      return { success: true, message: "Email archived successfully" };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to archive email",
      };
    }
  },
});

export const modifyEmailLabelsTool = tool({
  name: "modify_email_labels",
  description:
    "Add or remove labels from an email. Required: messageId (string). Optional: addLabels (array of label ID strings like ['INBOX', 'STARRED']), removeLabels (array of label ID strings).",
  parameters: z.object({
    messageId: z.string().min(1),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the gmail found");
      }
      const refreshToken = getrefresToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }
      const gmail = new GmailService(refreshToken);
      await gmail.modifyMessageLabels(
        args.messageId,
        args.addLabels,
        args.removeLabels
      );
      return {
        success: true,
        message: "Email labels modified successfully",
        data: { added: args.addLabels || [], removed: args.removeLabels || [] },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to modify labels",
      };
    }
  },
});
