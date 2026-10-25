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
    snippet: z.string().nullable(),
    labels: z.array(z.string()).nullable(),
    hasAttachments: z.boolean().nullable(),
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
      body: z.string().nullable(),
      attachments: z
        .array(
          z.object({
            filename: z.string(),
            mimeType: z.string(),
            size: z.number(),
          })
        )
        .nullable(),
    })
    .nullable(),
});
export const AgentResponseSchema = z.object({
  isDynamic: z.boolean(),
  content: z.string(),
  dynamicContent: z.array(DynamicContentSchema).nullable(),
});

export const RESPONSE_FORMAT_INSTRUCTIONS = `
RESPONSE FORMAT:
- isDynamic: true for Gmail data, false otherwise
- One dynamicContent entry per email/operation (multiple for bulk)
- Always include emailId, threadId, operation; url=null if deleted
- content: human-readable summary
`;

const EMAIL_FORMATTING_INSTRUCTIONS = `
EMAIL FORMATTING:
- Always write a specific subject line (e.g. "Your schedule for Mon, 27 Oct"), never an empty or generic one.
- Default to HTML (isHtml: true). Plain text only for a single short sentence.
- If the user gives exact text or HTML to send, send it unchanged (isHtml: true if it is HTML).
- Write email-safe HTML: one outer <div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.55; color: #1f2328; max-width: 600px;">.
  Inline styles only. No <style>, <script>, <html>/<head>, external CSS, images you were not given, or markdown syntax (no **, #, - bullets).
- Structure: a short greeting, one or two sentences of context, the content, a brief sign-off.
- Use <h3 style="margin: 20px 0 8px; font-size: 16px;"> for section titles and <p style="margin: 0 0 12px;"> for paragraphs.
- Lists: <ul style="margin: 0 0 12px; padding-left: 20px;"><li style="margin: 4px 0;">.
- Schedules and other tabular data: a table, e.g.
  <table style="border-collapse: collapse; width: 100%;"><tr><th style="text-align: left; padding: 8px; border-bottom: 2px solid #d0d7de;">Time</th>...</tr>
  <tr><td style="padding: 8px; border-bottom: 1px solid #eaeef2;">09:00 to 10:00</td>...</tr></table>
- Write times in the user's timezone with the day and date, and include links (Meet, documents) as <a href="..." style="color: #0969da;">.
`;

export const gmailReaderAgent = new Agent({
  name: "gmail-reader-agent",
  instructions: `
You are the Gmail Reader.
- Search, list, read emails.
- Use Gmail search syntax in the query: "in:sent" for mail the user sent, "to:"/"from:" for people, quoted words for content, "newer_than:7d" or "after:2026/10/01" for dates. Results come newest first.
- For "who did I send X to", search in:sent with the words and report the "to" address of the newest match.
- Always state the exact email addresses, message ids and dates you found, so another agent can act on them.
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [listEmailsTool, listEmailIdsTool, readEmailTool],
  outputType: AgentResponseSchema,
});
export const gmailWriterAgent = new Agent({
  name: "gmail-writer-agent",
  instructions: `
You are the Gmail Writer.
- Compose, send, reply, forward emails.
- Send only to addresses given in the request. Never guess or invent a recipient; if none is given, say so instead of sending.

${EMAIL_FORMATTING_INSTRUCTIONS}
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



