
import { Agent, handoff } from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import { z } from "zod";

/* -------------------------
      SCHEMA DEFINITIONS
--------------------------- */


export const CalendarEventSchema = z.object({
  type: z.literal("calendar"),
  title: z.string(),
  url: z.string().nullable(),

  metadata: z.object({
    eventId: z.string().nullable(),
    calendarId: z.string().nullable(),
    start: z.string(),
    end: z.string(),
    attendees: z.array(z.string()).nullable(),
    location: z.string().nullable(),
    description: z.string().nullable(),
    operation: z.enum(["read", "created", "updated", "deleted"]),
  }),

  data: z
    .object({
      // Explicit object type with optional properties
      rawEvent: z.object({}).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export const CalendarResponseSchema = z.object({
  isDynamic: z.boolean(),
  content: z.string(),
  dynamicContent: z.array(CalendarEventSchema).nullable(),
});

/* -------------------------
     RESPONSE FORMAT TEXT
--------------------------- */

const RESPONSE_FORMAT_INSTRUCTIONS = `
RESPONSE FORMAT:
- isDynamic: true when returning Calendar event data
- dynamicContent: one entry per event
- Always include eventId, calendarId, operation
- For delete: url = null
- content: human-readable summary
`;

/* -------------------------
      IMPORT CALENDAR TOOLS
--------------------------- */

import {
  listCalendarEventsTool,
  getCalendarEventTool,
  createCalendarEventTool,
  updateCalendarEventTool,
  deleteCalendarEventTool,
  quickAddCalendarEventTool,
} from "../tools/calender";

/* -------------------------
       READER AGENT
--------------------------- */

export const calendarReaderAgent = new Agent({
  name: "calendar-reader-agent",
  handoffDescription: "List/search/read calendar events.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Calendar Reader Agent.

Your primary responsibilities:
- List upcoming events
- Search for specific events
- Read full event details
- Filter events by date range
- Provide event summaries

When a user asks to:
- Create, modify, or update events → hand off to the writer agent
- Delete events → hand off to the delete agent

Always be helpful and provide clear summaries of events.

${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [listCalendarEventsTool, getCalendarEventTool],
  outputType: CalendarResponseSchema,
});

/* -------------------------
       WRITER AGENT
--------------------------- */

export const calendarWriterAgent = new Agent({
  name: "calendar-writer-agent",
  handoffDescription: "Create and update calendar events.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Calendar Writer Agent.
If you are not given an eventId, find the event yourself with list_calendar_events (by date, time or title) and use the match's id. Ask only if nothing matches or several events match equally well.

Your primary responsibilities:
- Create new calendar events
- Update existing events (title, time, date, description, attendees, location)
- Use quick add for natural language event creation
- Confirm successful event creation/updates

Rules:
- If user request is clear → perform action immediately
- If ambiguous or missing required info → ask clarifying questions
- Always confirm the action with the user
- Provide event details after creation/update

When a user asks to:
- List or read events → hand off to the reader agent
- Delete events → hand off to the delete agent

${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [listCalendarEventsTool, getCalendarEventTool, createCalendarEventTool, updateCalendarEventTool, quickAddCalendarEventTool],
  outputType: CalendarResponseSchema,
});

/* -------------------------
       DELETE AGENT
--------------------------- */

export const calendarDeleteAgent = new Agent({
  name: "calendar-delete-agent",
  handoffDescription: "Delete calendar events (requires confirmation).",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Calendar Delete Agent.
If you are not given an eventId, find the event yourself with list_calendar_events (by date, time or title) and use the match's id. Ask only if nothing matches or several events match equally well.

CRITICAL SAFETY RULES:
- NEVER delete an event without explicit user confirmation
- Accepted confirmation phrases:
  • "DELETE EVENT"
  • "YES DELETE"
  • "CONFIRM DELETE"
  • "DELETE PERMANENTLY"
  • "YES"
  • "CONFIRM"

Workflow:
1. Identify the event to delete
2. Ask for explicit confirmation with event details
3. Wait for user confirmation
4. Only after confirmation, execute deletion
5. Confirm successful deletion

Before confirmation:
  - isDynamic: false (no event data changes)
After successful deletion:
  - isDynamic: true
  - operation: "deleted"
  - url: null

When a user asks to:
- Create or update events → hand off to the writer agent
- List or read events → hand off to the reader agent

${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [listCalendarEventsTool, getCalendarEventTool, deleteCalendarEventTool],
  outputType: CalendarResponseSchema,
});

/* -------------------------
       COORDINATOR AGENT (ENTRY POINT)
--------------------------- */

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

/* -------------------------
    INTERNAL HANDOFF RULES
--------------------------- */


