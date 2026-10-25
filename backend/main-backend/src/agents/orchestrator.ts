import { Agent, handoff, type Tool } from "@openai/agents";
import { PRIVATE_RUN_CONFIG } from "./runConfig";
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
import {
  MEET_RESPONSE_FORMAT_INSTRUCTIONS,
  MeetAgentResponseSchema,
  meetCreatorAgent,
  meetDeleteAgent,
  meetEditorAgent,
  meetReaderAgent,
} from "./meet";
import {
  calendarDeleteAgent,
  calendarReaderAgent,
  CalendarResponseSchema,
  calendarWriterAgent,
} from "./calender"; // kept as your original path
import { driveCoordinatorAgent } from "./drive";
import { formCoordinatorAgent } from "./form";

// Small recommended prefix reused across coordinators
const RECOMMENDED_PROMPT_PREFIX = `You are a specialized coordinator agent. Always analyze the user's request carefully before routing.`;

// -------------------- Gmail Handoffs & Coordinator --------------------
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

export const gmailCoordinatorAgent = new Agent({
  name: "gmail-coordinator-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Gmail coordinator (entry point for all Gmail operations).

Routing Logic:
- Route to reader (default for view/search/list operations).
- Route to writer for compose/send/reply/forward requests.
- Route to trash for reversible deletes (trash/archive/spam/labels).
- Route to delete ONLY for explicit permanent-delete confirmations with phrases like "delete permanently" or "erase permanently".

Common Patterns:
- "get my emails"/"show my emails"/"list emails" → reader
- "find and delete" → reader first (so user can review before deletion)
- "send email"/"compose message" → writer
- "move to trash"/"archive this" → trash
- "permanently delete"/"erase forever" → delete (with confirmation)

Default to reader if unclear which agent to use.

${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [],
  outputType: AgentResponseSchema,
  handoffs: gmailHandoffs,
});

// -------------------- Sheets Handoffs & Coordinator --------------------
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

Common Patterns:
- "show me the data"/"read cells" → reader
- "update cell A1"/"add new row" → writer
- "create new sheet"/"delete spreadsheet" → management
- "insert 5 rows"/"delete column B" → structure
- "make cells bold"/"color this range red" → formatting
- "find row with value X" → helper

If unclear which agent to use, ask the user for clarification.
Keep responses short and action-oriented.`,
  tools: [],
  handoffs: sheetsHandoffs,
});

// -------------------- Meet Handoffs & Coordinator --------------------
const meetHandoffs = [
  handoff(meetReaderAgent, {
    toolDescriptionOverride:
      "Read meeting/event metadata and details. Use for listing, searching, or getting meeting details (includes expanded recurring instances).",
  }),
  handoff(meetCreatorAgent, {
    toolDescriptionOverride:
      "Create new meetings, quick-create from natural language, and configure recurring meetings and reminders. Use for scheduling and inviting attendees.",
  }),
  handoff(meetEditorAgent, {
    toolDescriptionOverride:
      "Update meeting fields (time, title, description), add/remove attendees, and move meetings between calendars. Use for rescheduling and attendee management.",
  }),
  handoff(meetDeleteAgent, {
    toolDescriptionOverride:
      "Cancel (soft-delete) or permanently delete meetings. Use for explicit cancellation or permanent deletion requests (requires confirmation).",
  }),
];

export const meetCoordinatorAgent = new Agent({
  name: "meet-coordinator-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Google Meet coordinator (entry point for all Google Meet / Calendar event operations).

Routing logic:
- Route to reader for view/search/list/get operations (default).
- Route to creator for create / quick-create / scheduling requests.
- Route to editor for updates: modify time/title/description, add/remove attendees, reschedule, or move between calendars.
- Route to delete for "cancel", "cancel the meeting", "delete permanently", or explicit permanent-delete requests (ask for confirmation when deletion is destructive).
- For ambiguous requests default to reader and explain why.

Common patterns:
- "list my meetings"/"show meetings" -> reader
- "create a meeting"/"schedule" -> creator
- "move this event to another calendar"/"reschedule" -> editor
- "cancel the meeting" -> delete (soft cancel by default)
- "delete permanently" -> delete (requires explicit confirmation)

Behavior requirements:
- If handing off to delete, clearly state whether the action will cancel (keeps a record) or permanently delete (irreversible) and require confirmation for permanent deletes.
- Preserve timezone and recurrence intent when routing to creator/editor.
- When a create/update includes attendees, note whether notifications should be sent (default: send unless user requests otherwise).

${MEET_RESPONSE_FORMAT_INSTRUCTIONS}
`,
  tools: [],
  outputType: MeetAgentResponseSchema,
  handoffs: meetHandoffs,
});

// -------------------- Calendar Handoffs & Coordinator --------------------
export const calendarHandoffs = [
  handoff(calendarReaderAgent, {
    toolDescriptionOverride: "List, search, or read calendar events.",
  }),
  handoff(calendarWriterAgent, {
    toolDescriptionOverride: "Create or update calendar events.",
  }),
  handoff(calendarDeleteAgent, {
    toolDescriptionOverride: "Delete calendar events (with confirmation).",
  }),
];

export const calendarCoordinatorAgent = new Agent({
  name: "calendar-coordinator-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Calendar Coordinator Agent (ENTRY POINT).

Your role: Route user requests to the appropriate specialized agent.

ROUTING RULES:
┌─ LIST/SEARCH/READ:
│  Keywords: "show", "list", "find", "search", "display", "get", "view", "upcoming", "what events"
│  Action: → calendarReaderAgent
│
├─ CREATE/ADD/SCHEDULE:
│  Keywords: "create", "add", "schedule", "plan", "book", "new event", "quick add"
│  Action: → calendarWriterAgent
│
├─ UPDATE/MODIFY/CHANGE:
│  Keywords: "update", "change", "modify", "reschedule", "move", "edit", "update time/date/title"
│  Action: → calendarWriterAgent
│
└─ DELETE/CANCEL/REMOVE:
   Keywords: "delete", "cancel", "remove", "drop", "clear", "close"
   Action: → calendarDeleteAgent (REQUIRES CONFIRMATION)

DEFAULT BEHAVIOR:
- If unclear, ask clarifying questions
- Be proactive and helpful
- Confirm actions before execution
- Provide clear summaries of results

${RESPONSE_FORMAT_INSTRUCTIONS}`,
  handoffs: calendarHandoffs,
  tools: [],
  outputType: CalendarResponseSchema,
});

// -------------------- Orchestrator (manager with service agents as tools) --------------------
/*
  The orchestrator keeps control of the whole request and calls each service coordinator as a tool.
  A coordinator still hands off to its own specialists, but the result comes back here, so one
  request can chain services: read the calendar, find a contact in Gmail, then send an email.
  (With handoffs only, the first coordinator took over and the run ended with its answer.)
*/

// asTool() starts its own Runner, so every agent tool needs the private settings too.
export { PRIVATE_RUN_CONFIG };

/** Tool name -> service id, used to label progress in the chat UI. */
export const SERVICE_TOOLS = {
  gmail_agent: "gmail",
  calendar_agent: "calendar",
  meet_agent: "meet",
  sheets_agent: "sheets",
  drive_agent: "drive",
  forms_agent: "forms",
} as const;

const serviceTool = (
  agent: Agent<any, any>,
  toolName: keyof typeof SERVICE_TOOLS,
  toolDescription: string
) =>
  // Coordinators only route. Requiring a tool call makes them hand off to a specialist every time;
  // otherwise they sometimes reply with their routing explanation and the task never runs.
  agent.clone({ modelSettings: { ...agent.modelSettings, toolChoice: "required" } }).asTool({
    toolName,
    toolDescription,
    // Structured replies (with ids and dynamicContent) go back to the orchestrator as JSON.
    customOutputExtractor: (result) =>
      typeof result.finalOutput === "string"
        ? result.finalOutput
        : JSON.stringify(result.finalOutput ?? null),
    runConfig: PRIVATE_RUN_CONFIG,
    runOptions: { maxTurns: 15 },
  });

const orchestratorTools = [
  serviceTool(
    gmailCoordinatorAgent,
    "gmail_agent",
    "Gmail: search/list/read emails (including sent mail), send formatted emails, reply, forward, trash, archive, label."
  ),
  serviceTool(
    calendarCoordinatorAgent,
    "calendar_agent",
    "Google Calendar: list/search events for a date or range, create, update and delete events."
  ),
  serviceTool(
    meetCoordinatorAgent,
    "meet_agent",
    "Google Meet: schedule meetings with Meet links, list/update/cancel meetings, manage attendees."
  ),
  serviceTool(
    sheetsCoordinatorAgent,
    "sheets_agent",
    "Google Sheets: create spreadsheets, read/write/append cells, manage sheets, rows, columns and formatting."
  ),
  serviceTool(
    driveCoordinatorAgent,
    "drive_agent",
    "Google Drive: find, list, upload, share, move and delete files and folders."
  ),
  serviceTool(
    formCoordinatorAgent,
    "forms_agent",
    "Google Forms: create and edit forms, add questions, read form responses."
  ),
];

const orchestratorInstructions = (timeZone: string) => {
  const now = new Date();
  const today = now.toLocaleDateString("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" });
  const isoDate = now.toLocaleDateString("en-CA", { timeZone });

  return `You are GoPilot's orchestrator. You carry out the user's request across their Google apps by calling service agents as tools, step by step, and you stay in charge until the whole request is done.

Today is ${today} (${isoDate}), ${time} in the user's timezone ${timeZone}.
Resolve relative dates ("tomorrow", "27 Oct", "next Friday") to exact dates in this timezone. A date without a year means its next occurrence.

TOOLS: gmail_agent, calendar_agent, meet_agent, sheets_agent, drive_agent, forms_agent.
Each takes one "input": a complete, self-contained instruction. Service agents cannot see this conversation, so include everything they need: exact dates with the timezone, email addresses, ids, names, and the full content to write.

HOW TO WORK
1. Break the request into steps and note which steps need another step's result.
2. Call independent steps together (in parallel). Call dependent steps only after you have the data, and pass the concrete values you got (addresses, event details, ids), never placeholders.
3. Find what you need yourself instead of asking the user:
   - Things from earlier in this chat ("that meeting", "the email") are listed after "Items:" (or "[details]") in your earlier replies, with their ids. Put the id in your instruction (e.g. "Add guest x@y.com to event id abc123").
   - Otherwise ask the matching service agent to look it up first (e.g. calendar_agent: "Find the event on 2026-10-30 at 15:00 and return its id").
   - If a service agent replies that it needs an id or detail you can find, find it and call again. Don't pass that question on to the user.
   Ask the user only when it truly can't be found or several items match equally well.
4. Do routine edits the user asked for (add a guest, rename, reschedule, update cells) without asking for confirmation, keeping everything else unchanged.
   Confirm only before permanent deletes or before sending to someone the request didn't identify. Never invent recipients.
5. If a step fails, don't continue with guessed data, and don't say "technical issue": report the actual error briefly. If a tool says a service isn't connected, tell the user to connect it in Settings > Connected apps.
6. For email, give gmail_agent the recipients, the purpose and all the content (e.g. every event with time, title, location and link), and ask for a well-formatted HTML email with a clear subject.

EXAMPLE: "send what's on my calendar on 27 Oct to the person I last sent 'hi' to"
- calendar_agent: "List all events on 2026-10-27 in ${timeZone} with start/end times, titles, locations, Meet links and attendees."
- gmail_agent: "Search sent mail (in:sent) for the most recent email containing 'hi' and return the recipient's email address."
  These two don't depend on each other: call both at once.
- gmail_agent: "Send a well-formatted HTML email to <the address found> with subject 'My schedule for Monday, 27 October' showing these events in a table: <the events>."

SAVED WORKFLOWS
The user may ask to run one of their saved workflows ("run my weekly report workflow", "send my schedule for Friday to Ana").
- Call list_my_workflows, pick the one that matches, and fill its inputs from the request (dates as YYYY-MM-DD, times as HH:MM, emails exactly as given).
- If a required input can't be worked out from the request or the conversation, ask the user for it in one short message instead of guessing.
- Then call run_workflow. Don't do the workflow's steps yourself. Tell the user it has started and that they can follow it, and approve if it pauses, in the card below.
- If none of their workflows fits, say so and offer to do the task directly.

Memory from the user's earlier chats may appear as a system message. Use it only when it helps.

FINAL ANSWER
Don't write anything before or between tool calls. When the work is done, reply in concise Markdown: what you did and the key results (who was emailed, what was found, links). Never paste raw JSON.
If the request needs no app (a greeting or general question), just answer.`;
};

/**
 * Built per request so the instructions carry the current date and the user's timezone, and so
 * per-user tools (running saved workflows) can be added.
 */
export const createOrchestrator = (timeZone: string, extraTools: Tool<any>[] = []) =>
  new Agent<any>({
    name: "orchestrator-agent",
    model: "gpt-4.1",
    instructions: () => orchestratorInstructions(timeZone),
    tools: [...orchestratorTools, ...extraTools],
  });
