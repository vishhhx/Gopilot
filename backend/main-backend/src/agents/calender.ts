
import { Agent, handoff } from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import { z } from "zod";

/* -------------------------
      SCHEMA DEFINITIONS
--------------------------- */

// const CalendarEventSchema = z.object({
//   type: z.literal("calendar"),
//   title: z.string(),
//   url: z.string().nullable(),
//   metadata: z.object({
//     eventId: z.string(),
//     calendarId: z.string(),
//     start: z.string(),
//     end: z.string(),
//     attendees: z.array(z.string()).optional(),
//     location: z.string().optional(),
//     description: z.string().optional(),
//     operation: z.enum(["read", "created", "updated", "deleted"]),
//   }),
//   data: z
//     .object({
//       rawEvent: z.any().optional(),
//     })
//     .optional(),
// });

// const CalendarResponseSchema = z.object({
//   isDynamic: z.boolean(),
//   content: z.string(),
//   dynamicContent: z.array(CalendarEventSchema).optional(),
// });


// const CalendarEventSchema = z.object({
//   type: z.literal("calendar"),
//   title: z.string(),
//   url: z.string().nullable(),

//   metadata: z.object({
//     eventId: z.string(),
//     calendarId: z.string(),
//     start: z.string(),
//     end: z.string(),
//     attendees: z.array(z.string()).nullable(),
//     location: z.string().nullable(),
//     description: z.string().nullable(),
//     operation: z.enum(["read", "created", "updated", "deleted"]),
//   }),

//   data: z
//     .object({
//       rawEvent: z.object({}).catchall(z.string()).nullable(),  // FINAL FIX
//     })
//     .nullable(),
// });

// const CalendarResponseSchema = z.object({
//   isDynamic: z.boolean(),
//   content: z.string(),
//   dynamicContent: z.array(CalendarEventSchema).nullable(),
// });

const CalendarEventSchema = z.object({
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

const CalendarResponseSchema = z.object({
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
  tools: [createCalendarEventTool, updateCalendarEventTool, quickAddCalendarEventTool],
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
  tools: [deleteCalendarEventTool],
  outputType: CalendarResponseSchema,
});

/* -------------------------
       COORDINATOR AGENT (ENTRY POINT)
--------------------------- */

const calendarHandoffs = [
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

// Reader can escalate to Writer or Delete
calendarReaderAgent.handoffs = [
  handoff(calendarWriterAgent, {
    toolDescriptionOverride:
      "Create or modify events based on user request from reading events.",
  }),
  handoff(calendarDeleteAgent, {
    toolDescriptionOverride: "Delete events if user requests deletion.",
  }),
  handoff(calendarCoordinatorAgent, {
    toolDescriptionOverride: "Return to coordinator if uncertain.",
  }),
];

// Writer can escalate to Reader or Delete
calendarWriterAgent.handoffs = [
  handoff(calendarReaderAgent, {
    toolDescriptionOverride: "Verify created/updated events by reading them.",
  }),
  handoff(calendarDeleteAgent, {
    toolDescriptionOverride: "Switch to delete if user changes mind.",
  }),
  handoff(calendarCoordinatorAgent, {
    toolDescriptionOverride: "Return to coordinator for other requests.",
  }),
];

// Delete can escalate to Reader or Writer
calendarDeleteAgent.handoffs = [
  handoff(calendarReaderAgent, {
    toolDescriptionOverride: "Verify deletion by listing remaining events.",
  }),
  handoff(calendarWriterAgent, {
    toolDescriptionOverride: "Create a new event instead of deleting.",
  }),
  handoff(calendarCoordinatorAgent, {
    toolDescriptionOverride: "Return to coordinator for other requests.",
  }),
];

export default calendarCoordinatorAgent;