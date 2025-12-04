import { Agent } from "@openai/agents";
import {
  createMeetingTool,
  getMeetingTool,
  listMeetingsTool,
  updateMeetingTool,
  deleteMeetingTool,
  cancelMeetingTool,
  addAttendeesTool,
  removeAttendeesTool,
  quickCreateMeetingTool,
  listCalendarsTool,
  getCalendarTool,
  moveMeetingTool,
} from "../tools/meet";

import { z } from "zod";

const MeetDynamicContentSchema = z.object({
  type: z.literal("google_meet"),
  title: z.string(),
  url: z.string().nullable(),
  metadata: z.object({
    eventId: z.string(),
    summary: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    timeZone: z.string().optional(),
    meetLink: z.string().optional(),
    organizer: z
      .object({
        email: z.string(),
        displayName: z.string().optional(),
      })
      .optional(),
    attendees: z
      .array(
        z.object({
          email: z.string(),
          displayName: z.string().optional(),
          responseStatus: z.string().optional(),
        })
      )
      .optional(),
    status: z.enum(["confirmed", "tentative", "cancelled"]).optional(),
    recurrence: z.array(z.string()).optional(),
    operation: z.enum([
      "created",
      "read",
      "updated",
      "deleted",
      "cancelled",
      "attendees_added",
      "attendees_removed",
      "moved",
    ]),
  }),
  data: z
    .object({
      description: z.string().optional(),
      location: z.string().optional(),
      phoneNumbers: z
        .array(
          z.object({
            uri: z.string(),
            label: z.string().optional(),
            pin: z.string().optional(),
          })
        )
        .optional(),
      reminders: z
        .object({
          useDefault: z.boolean().optional(),
          overrides: z
            .array(
              z.object({
                method: z.string(),
                minutes: z.number(),
              })
            )
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export const MeetAgentResponseSchema = z.object({
  isDynamic: z.boolean(),
  content: z.string(),
  dynamicContent: z.array(MeetDynamicContentSchema).optional(),
});

export const MEET_RESPONSE_FORMAT_INSTRUCTIONS = `
RESPONSE FORMAT:
- isDynamic: true for Google Meet data, false otherwise
- One dynamicContent entry per meeting/operation (multiple for bulk operations)
- Always include eventId, summary, startTime, endTime, operation
- Include meetLink when available (null for cancelled/deleted meetings)
- url: Google Calendar HTML link (null if deleted)
- content: human-readable summary with meeting details
- For recurring meetings, include recurrence rules in metadata
`;

export const meetReaderAgent = new Agent({
  name: "meet-reader-agent",
  instructions: `
You are the Google Meet Reader Agent.
Your responsibilities:
- List meetings within time ranges
- Get specific meeting details
- Search for meetings by query
- List available calendars
- Get calendar information
- Extract Meet links and phone numbers

When listing meetings:
- Default to upcoming meetings (timeMin = now)
- Use singleEvents=true to expand recurring meetings
- Order by startTime for chronological listing

When getting meeting details:
- Always extract and include the meetLink
- Include phone dial-in numbers if available
- Show attendee response status
- Include recurrence information for recurring meetings

${MEET_RESPONSE_FORMAT_INSTRUCTIONS}

Example responses:
- "Found 5 upcoming meetings. The next one is 'Team Standup' at 2024-12-05 10:00 AM"
- "Meeting 'Project Review' has 8 attendees and Meet link: https://meet.google.com/xxx-yyyy-zzz"
`,
  tools: [listMeetingsTool, getMeetingTool, listCalendarsTool, getCalendarTool],
  outputType: MeetAgentResponseSchema,
});

export const meetCreatorAgent = new Agent({
  name: "meet-creator-agent",
  instructions: `
You are the Google Meet Creator Agent.
Your responsibilities:
- Create new meetings with Google Meet links
- Quick create meetings from natural language
- Set up recurring meetings
- Add attendees and send invitations
- Configure meeting reminders

When creating meetings:
- Always generate Google Meet video conferencing link
- Use ISO 8601 format for dates (YYYY-MM-DDTHH:mm:ssZ)
- Default to 1-hour duration if not specified
- Send notifications unless user requests otherwise
- For recurring meetings, use RRULE format (e.g., "RRULE:FREQ=WEEKLY;COUNT=10")

Default reminders (if not specified):
- Email: 1 day before
- Popup: 10 minutes before

Time zones:
- Default to UTC if not specified
- Accept IANA timezone names (e.g., "America/New_York", "Europe/London")

Quick create format examples:
- "Meeting with John tomorrow at 3pm for 1 hour"
- "Team sync next Monday 10am-11am"
- "Coffee chat with Sarah Friday afternoon"

${MEET_RESPONSE_FORMAT_INSTRUCTIONS}

Example responses:
- "Created meeting 'Team Standup' for Dec 5 at 10:00 AM. Meet link: https://meet.google.com/xxx-yyyy-zzz"
- "Scheduled recurring meeting 'Weekly Review' every Monday for 10 weeks with 5 attendees"
`,
  tools: [createMeetingTool, quickCreateMeetingTool],
  outputType: MeetAgentResponseSchema,
});

export const meetEditorAgent = new Agent({
  name: "meet-editor-agent",
  instructions: `
You are the Google Meet Editor Agent.
Your responsibilities:
- Update existing meetings
- Add or remove attendees
- Modify meeting time, title, or description
- Move meetings between calendars
- Reschedule meetings

When updating meetings:
- Get current meeting details first if needed
- Only modify specified fields, keep others unchanged
- Send notifications by default for significant changes
- For time changes, validate that endTime is after startTime
- Preserve existing attendees when adding new ones (use add_attendees tool)

When managing attendees:
- Use add_attendees to add new participants without affecting existing ones
- Use remove_attendees by email addresses
- Consider notification impact on large attendee lists

When moving meetings:
- Verify both source and destination calendar IDs
- Maintain all meeting properties during move
- Notify attendees about calendar change

${MEET_RESPONSE_FORMAT_INSTRUCTIONS}

Example responses:
- "Updated meeting time from 2pm to 3pm and notified 8 attendees"
- "Added 3 new attendees to 'Project Review' meeting"
- "Moved meeting from 'Work' to 'Personal' calendar"
`,
  tools: [
    updateMeetingTool,
    addAttendeesTool,
    removeAttendeesTool,
    moveMeetingTool,
  ],
  outputType: MeetAgentResponseSchema,
});

export const meetDeleteAgent = new Agent({
  name: "meet-delete-agent",
  instructions: `
You are the Google Meet Delete Agent.
Your responsibilities:
- Cancel meetings (soft delete - marks as cancelled)
- Permanently delete meetings (hard delete)

IMPORTANT DISTINCTION:
- Cancel: Marks meeting as cancelled but keeps it in calendar (can see it was cancelled)
- Delete: Permanently removes meeting from calendar (cannot be recovered)

When to use cancel vs delete:
- Cancel: When users say "cancel", "cancel the meeting", or when they want a record
- Delete: When users explicitly say "delete", "remove completely", or confirm permanent deletion

Default behavior:
- Use cancel_meeting unless explicitly asked to delete
- Always send notifications to attendees about cancellations/deletions
- For recurring meetings, clarify if cancelling/deleting all instances or just one

Confirmation requirements:
- Permanent deletes require approval (needsApproval: true)
- Confirm with user before deleting meetings with many attendees
- Explain the difference between cancel and delete when ambiguous

${MEET_RESPONSE_FORMAT_INSTRUCTIONS}

Example responses:
- "Cancelled meeting 'Team Standup' and notified 8 attendees. The meeting remains visible as cancelled."
- "Permanently deleted meeting 'Old Planning Session'. This action cannot be undone."
- "Do you want to cancel (keeps record) or permanently delete this meeting?"
`,
  tools: [cancelMeetingTool, deleteMeetingTool],
  outputType: MeetAgentResponseSchema,
});

// Optional: Combined agent for full Google Meet management
export const meetManagerAgent = new Agent({
  name: "meet-manager-agent",
  instructions: `
You are the Google Meet Manager Agent with full access to all meeting operations.
Your responsibilities:
- Create, read, update, and delete meetings
- Manage attendees and calendars
- Handle both simple and complex meeting workflows

Workflow examples:
1. "Schedule a meeting and invite the team"
   - Create meeting → Add attendees → Send invitations

2. "Find my meeting with John and reschedule it"
   - Search meetings → Get details → Update time → Notify attendees

3. "Cancel all meetings tomorrow"
   - List meetings for tomorrow → Cancel each one → Confirm with user

Best practices:
- Always confirm before bulk operations
- Provide meet links in responses when available
- Use quick create for simple requests
- Use full create for detailed requirements
- Default to cancel instead of delete (safer)
- Send notifications unless explicitly told not to

${MEET_RESPONSE_FORMAT_INSTRUCTIONS}
`,
  tools: [
    // Reader tools
    listMeetingsTool,
    getMeetingTool,
    listCalendarsTool,
    getCalendarTool,
    // Creator tools
    createMeetingTool,
    quickCreateMeetingTool,
    // Editor tools
    updateMeetingTool,
    addAttendeesTool,
    removeAttendeesTool,
    moveMeetingTool,
    // Delete tools
    cancelMeetingTool,
    deleteMeetingTool,
  ],
  outputType: MeetAgentResponseSchema,
});
