import { Agent, handoff } from "@openai/agents";
import {
  gmailReaderAgent,
  gmailDeleteAgent,
  gmailTrashAgent,
  gmailWriterAgent,
  RESPONSE_FORMAT_INSTRUCTIONS,
  AgentResponseSchema,
} from "./gmail";
import {
  sheetsReaderAgent,
  sheetsFormattingAgent,
  sheetsHelperAgent,
  sheetsManagementAgent,
  sheetsStructureAgent,
  sheetsWriterAgent,
} from "./sheet";

const RECOMMENDED_PROMPT_PREFIX = `You are a specialized coordinator agent. Always analyze the user's request carefully before routing.`;

// Gmail handoffs configuration
const gmailHandoffs = [
  handoff(gmailReaderAgent, {
    toolDescriptionOverride:
      "Default: search/list/read Gmail messages. Use for viewing inbox, searching emails, or reading specific messages.",
  }),
  handoff(gmailWriterAgent, {
    toolDescriptionOverride:
      "Compose/send/reply/forward emails. Use for all email composition and sending tasks.",
  }),
  handoff(gmailTrashAgent, {
    toolDescriptionOverride:
      "Soft-delete: trash/archive/spam/labels. Use for reversible email organization and cleanup.",
  }),
  handoff(gmailDeleteAgent, {
    toolDescriptionOverride:
      "Permanent deletion ONLY with explicit phrases like 'delete permanently' or 'erase permanently'. Requires user confirmation.",
  }),
];

// Gmail Coordinator Agent
export const gmailCoordinatorAgent = new Agent({
  name: "gmail-coordinator-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Gmail coordinator (entry point for all Gmail operations).

Routing Logic:
- Route to reader (default for view/search/list operations).
- Route to writer for compose/send/reply/forward requests.
- Route to trash for reversible deletes (trash/archive/spam/labels).
- Route to delete ONLY for explicit permanent-delete confirmations with phrases like "delete permanently" or "erase permanently".
- For cross-service workflows with Sheets (e.g., export emails to spreadsheet), route to Sheets coordinator.

Common Patterns:
- "get my emails"/"show my emails"/"list emails" → reader
- "find and delete" → reader first (so user can review before deletion)
- "send email"/"compose message" → writer
- "move to trash"/"archive this" → trash
- "permanently delete"/"erase forever" → delete (with confirmation)

Default to reader if unclear which agent to use.

Always explain your routing decision briefly before handing off.
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [],
  outputType: AgentResponseSchema,
  handoffs: gmailHandoffs,
});

// Sheets handoffs configuration
const sheetsHandoffs = [
  handoff(sheetsReaderAgent, {
    toolDescriptionOverride:
      "Read spreadsheet metadata, values, and ranges. Use for viewing or searching spreadsheet data.",
  }),
  handoff(sheetsWriterAgent, {
    toolDescriptionOverride:
      "Update/append/batch-write cell values. Use for modifying spreadsheet data.",
  }),
  handoff(sheetsManagementAgent, {
    toolDescriptionOverride:
      "Create/add/duplicate/rename/delete sheets or spreadsheets. Use for structural management.",
  }),
  handoff(sheetsStructureAgent, {
    toolDescriptionOverride:
      "Insert/delete rows and columns. Use for modifying the spreadsheet grid structure.",
  }),
  handoff(sheetsFormattingAgent, {
    toolDescriptionOverride:
      "Apply formatting: colors, fonts, borders, alignment. Use for visual styling.",
  }),
  handoff(sheetsHelperAgent, {
    toolDescriptionOverride:
      "Utilities: find row, last row index, get sheet by name. Use for helper operations.",
  }),
];

// Sheets Coordinator Agent
export const sheetsCoordinatorAgent = new Agent({
  name: "sheets-coordinator-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Sheets coordinator (entry point for all Google Sheets operations).

Routing Logic:
- Route to reader for read/list/search values or metadata.
- Route to writer for update/append/batch write values.
- Route to management for create/add/duplicate/rename/delete sheets or spreadsheets.
- Route to structure for insert/delete rows/columns.
- Route to formatting for applying visual styles (colors, fonts, borders, etc.).
- Route to helper for utility operations (find row, last row, get sheet by name).
- For cross-service workflows with Gmail (e.g., send spreadsheet data via email), route to Gmail coordinator.

Common Patterns:
- "show me the data"/"read cells" → reader
- "update cell A1"/"add new row" → writer
- "create new sheet"/"delete spreadsheet" → management
- "insert 5 rows"/"delete column B" → structure
- "make cells bold"/"color this range red" → formatting
- "find row with value X" → helper
- "email this data" → Gmail coordinator

If unclear which agent to use, ask the user for clarification.
Always explain your routing decision briefly before handing off.
Keep responses short and action-oriented.`,
  tools: [],
  handoffs: sheetsHandoffs,
});

// Add cross-coordinator handoffs for multi-service workflows
sheetsCoordinatorAgent.handoffs!.push(
  handoff(gmailCoordinatorAgent, {
    toolDescriptionOverride:
      "Gmail operations: read/send emails. Use when Sheets workflow requires email functionality (e.g., sending spreadsheet data via email).",
  })
);

gmailCoordinatorAgent.handoffs!.push(
  handoff(sheetsCoordinatorAgent, {
    toolDescriptionOverride:
      "Gmail → Sheets cross-service workflows. Use when Gmail workflow requires spreadsheet functionality (e.g., exporting emails to a spreadsheet).",
  })
);

// Orchestrator Agent - top-level router
export const orchestratorAgent = new Agent({
  name: "orchestrator-agent",
  model: "gpt-4o-mini",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Orchestrator Agent - the top-level entry point for all Google Workspace operations.

Service Routing:
- Gmail operations → hand off to gmail_coordinator
  Examples: read emails, send messages, manage inbox, search messages, reply to emails, trash/delete emails
  
- Sheets operations → hand off to sheets_coordinator
  Examples: read cells, update values, create spreadsheets, format ranges, manage sheets, insert rows

- Unsupported services (Docs, Drive, Calendar) → politely inform user these are not currently supported

Multi-Service Workflows:
For requests involving multiple services (e.g., "export emails to spreadsheet"):
1. Identify which service needs to act FIRST
2. Hand off to that coordinator (e.g., gmail_coordinator for email export)
3. The coordinator will handle subsequent handoffs to other services as needed

Examples:
- "Export my emails to a spreadsheet" → gmail_coordinator (reads emails, then hands off to sheets)
- "Email me this spreadsheet data" → sheets_coordinator (reads data, then hands off to gmail)
- "List my unread emails" → gmail_coordinator
- "Show me the budget spreadsheet" → sheets_coordinator

Decision Process:
1. Analyze the user's request and identify the primary Google service involved
2. Output a brief 1-2 sentence plan explaining your routing decision
3. Hand off to the appropriate coordinator with clear context

If the request is ambiguous or involves unsupported services:
- Ask: "Which service should I use—Gmail or Sheets?"
- Or inform: "I currently support Gmail and Sheets. Docs, Drive, and Calendar are not yet supported."

Keep responses minimal, clear, and action-focused.`,
  tools: [],
  handoffs: [
    handoff(gmailCoordinatorAgent, {
      toolDescriptionOverride:
        "Gmail coordinator: handles inbox management, email search, sending, replying, forwarding, trash, archive, labels, deletion, and Gmail-to-Sheets workflows.",
    }),
    handoff(sheetsCoordinatorAgent, {
      toolDescriptionOverride:
        "Sheets coordinator: handles reading/writing data, managing spreadsheets, formatting cells, structural changes, and Sheets-to-Gmail workflows.",
    }),
  ],
});
