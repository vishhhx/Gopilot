import { Agent, handoff } from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
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
import { sheetsAgent } from "./sheet";
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

const AgentResponseSchema = z.object({
  isDynamic: z.boolean(),
  content: z.string(),
  dynamicContent: z.array(DynamicContentSchema).optional(),
});

const RESPONSE_FORMAT_INSTRUCTIONS = `
RESPONSE FORMAT:
- isDynamic: true for Gmail data, false otherwise
- One dynamicContent entry per email/operation (multiple for bulk)
- Always include emailId, threadId, operation; url=null if deleted
- content: human-readable summary
`;

/* --- Agents (concise prompts but same rules) --- */

export const gmailReaderAgent = new Agent({
  name: "gmail-reader-agent",
  handoffDescription: "Search, list, and read emails/threads.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Gmail reader.
- Search/list/read emails; return structured summaries (id, subject, from, date, snippet).
- If user wants actions after listing (delete/trash/etc.), present results then hand off.
- For delete flows: list/search first, show results, then hand off to delete/trash agent.
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [listEmailsTool, listEmailIdsTool, readEmailTool],
  outputType: AgentResponseSchema,
});

export const gmailWriterAgent = new Agent({
  name: "gmail-writer-agent",
  handoffDescription: "Compose, send, reply, and forward emails.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Gmail writer.
- Compose/send/reply/forward.
- Send immediately for clear single-recipient messages.
- For bulk (>5) or sensitive requests, ask for confirmation.
- Use operation "replied" for replies and "forwarded" for forwards.
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [sendEmailTool, replyToEmailTool, forwardEmailTool],
  outputType: AgentResponseSchema,
});

export const gmailTrashAgent = new Agent({
  name: "gmail-trash-agent",
  handoffDescription: "Soft-delete: trash, archive, mark spam, modify labels.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Gmail trash agent (reversible ops).
- Trash, archive, mark spam, modify labels.
- For >5 items ask for confirmation.
- If user requests permanent deletion after soft-delete, hand off to delete agent.
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
  handoffDescription:
    "Permanent, irreversible deletion (requires explicit confirmation).",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Gmail permanent-delete agent.
CRITICAL:
- NEVER delete without explicit confirmation: allowed confirmations: "YES DELETE PERMANENTLY", "DELETE FOREVER", "CONFIRM PERMANENT DELETION"
- If confirmation not exact, present warning and ask again.
Process:
1) Expect message IDs from previous agent.
2) If explicit confirmation -> delete; else ask again.
After deletion: set isDynamic:true with operation:"deleted" and url:null
Before deletion (confirm stage): set isDynamic:false
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [deleteEmailTool, batchDeleteEmailsTool],
  outputType: AgentResponseSchema,
});

/* --- Coordinator and handoffs (compact) --- */
const gmailHandoffs = [
  handoff(gmailReaderAgent, {
    toolDescriptionOverride: "Default: search/list/read.",
  }),
  handoff(gmailWriterAgent, {
    toolDescriptionOverride: "Compose/send/reply/forward.",
  }),
  handoff(gmailTrashAgent, {
    toolDescriptionOverride: "Soft-delete: trash/archive/spam/labels.",
  }),
  handoff(gmailDeleteAgent, {
    toolDescriptionOverride:
      "Permanent deletion ONLY with explicit phrases like 'delete permanently' or 'erase permanently'.",
  }),
];

export const gmailCoordinatorAgent = new Agent({
  name: "gmail-coordinator-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Gmail coordinator (entry point).
- Route to reader (default for view/search/list).
- Route to writer for compose/send/reply/forward.
- Route to trash for reversible deletes.
- Route to delete ONLY for explicit permanent-delete confirmations.
- For cross-service workflows with Sheets, route to Sheets coordinator.
- For "get my emails"/"show my emails"/"list emails" → reader.
- For "find and delete" → reader first (so user can review).
Default to reader if unclear.
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [],
  handoffs: [
    ...gmailHandoffs,
    handoff(sheetsAgent, {
      toolDescriptionOverride: "Gmail → Sheets cross-service workflows.",
    }),
  ],
  outputType: AgentResponseSchema,
});

/* --- Internal agent handoffs (compact arrays) --- */

gmailReaderAgent.handoffs = [
  handoff(gmailTrashAgent, {
    toolDescriptionOverride: "Soft-delete operations.",
  }),
  handoff(gmailDeleteAgent, {
    toolDescriptionOverride:
      "Permanent delete ONLY with explicit confirmation phrases.",
  }),
];

gmailWriterAgent.handoffs = [
  handoff(gmailReaderAgent, {
    toolDescriptionOverride:
      "Fetch original message for reply/forward context.",
  }),
];

gmailTrashAgent.handoffs = [
  handoff(gmailReaderAgent, {
    toolDescriptionOverride: "Return to reader to verify results.",
  }),
  handoff(gmailDeleteAgent, {
    toolDescriptionOverride: "Escalate to permanent delete if requested.",
  }),
];

gmailDeleteAgent.handoffs = [
  handoff(gmailReaderAgent, {
    toolDescriptionOverride: "Verify deletion results if requested.",
  }),
  handoff(gmailTrashAgent, {
    toolDescriptionOverride: "Switch to soft-delete if user changes mind.",
  }),
];

export default gmailCoordinatorAgent;
