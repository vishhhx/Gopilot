import { Agent } from "@openai/agents";
import {
  batchDeleteEmailsTool,
  deleteEmailTool,
  forwardEmailTool,
  listEmailIdsTool,
  listEmailsTool,
  readEmailTool,
  replyToEmailTool,
  sendEmailTool,
  archiveEmailTool,
  markAsSpamTool,
  modifyEmailLabelsTool,
  trashEmailTool,
  untrashEmailTool,
} from "../tools/gmail";

import { z } from "zod";
const DynamicContentSchema = z.object({
  type: z.literal("gmail"),
  title: z.string(),
  url: z.string().nullable(),
  metadata: z.object({
    emailId: z.string(),
    threadId: z.string(),
    from: z.string(),
    to: z.array(z.string()),
    subject: z.string(),
    date: z.string(),
    snippet: z.string().optional(),
    labels: z.array(z.string()).optional(),
    hasAttachments: z.boolean().optional(),
    operation: z.enum([
      "read",
      "sent",
      "deleted",
      "archived",
      "trashed",
      "forwarded",
      "replied",
      "marked_as_spam",
    ]),
  }),
  data: z
    .object({
      body: z.string().optional(),
      attachments: z
        .array(
          z.object({
            filename: z.string(),
            mimeType: z.string(),
            size: z.number(),
          })
        )
        .optional(),
    })
    .optional(),
});
export const AgentResponseSchema = z.object({
  isDynamic: z.boolean(),
  content: z.string(),
  dynamicContent: z.array(DynamicContentSchema).optional(),
});

export const RESPONSE_FORMAT_INSTRUCTIONS = `
RESPONSE FORMAT:
- isDynamic: true for Gmail data, false otherwise
- One dynamicContent entry per email/operation (multiple for bulk)
- Always include emailId, threadId, operation; url=null if deleted
- content: human-readable summary
`;

export const gmailReaderAgent = new Agent({
  name: "gmail-reader-agent",
  instructions: `
You are the Gmail Reader.
- Search, list, read emails.
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [listEmailsTool, listEmailIdsTool, readEmailTool],
  outputType: AgentResponseSchema,
});
export const gmailWriterAgent = new Agent({
  name: "gmail-writer-agent",
  instructions: `
You are the Gmail Writer.
- Compose, send, reply, forward emails.
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [sendEmailTool, replyToEmailTool, forwardEmailTool],
  outputType: AgentResponseSchema,
});
export const gmailTrashAgent = new Agent({
  name: "gmail-trash-agent",
  instructions: `
You are the Gmail Trash Agent.
- Trash, untrash, archive, spam, modify labels.
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [
    archiveEmailTool,
    markAsSpamTool,
    modifyEmailLabelsTool,
    trashEmailTool,
    untrashEmailTool,
  ],
  outputType: AgentResponseSchema,
});
export const gmailDeleteAgent = new Agent({
  name: "gmail-delete-agent",
  instructions: `
You are the Gmail Permanent Delete Agent.
- Only delete permanently with explicit confirmation.
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [deleteEmailTool, batchDeleteEmailsTool],
  outputType: AgentResponseSchema,
});



