import { tool, RunContext } from "@openai/agents";
import { z } from "zod";
import { GoogleMeetService } from "../utils/google/meet";

export interface Tokens {
  service: string;
  refreshToken: string;
}

function getRefreshToken(tokens: Tokens[]): string {
  const res = tokens.filter((token) => token.service === "calendar");
  if (res.length <= 0) {
    throw new Error("No refresh token for Google Calendar/Meet found");
  }
  return res[0].refreshToken;
}

// ------------------------------------------------------------------
// Create Meeting Tool
// ------------------------------------------------------------------
export const createMeetingTool = tool({
  name: "create_meeting",
  description: `
Create a new Google Meet meeting with video conferencing.
Parameters:
- summary: Meeting title/subject (required)
- description: Meeting description/agenda (nullable)
- startTime: ISO 8601 datetime string (required)
- endTime: ISO 8601 datetime string (required)
- timeZone: IANA timezone (nullable, default: "UTC")
- attendees: Array of objects with email and nullable displayName (nullable)
- sendNotifications: Send email invites (nullable, default: true)
- calendarId: Calendar ID (nullable, default: "primary")
- recurrence: Array of RRULE strings (nullable)
  `,
  parameters: z.object({
    summary: z.string().min(1).describe("Meeting title"),
    description: z.string().nullable().describe("Meeting description"),
    startTime: z.string().describe("Start time in ISO 8601 format"),
    endTime: z.string().describe("End time in ISO 8601 format"),
    timeZone: z.string().nullable().describe("IANA timezone"),
    attendees: z
      .array(
        z.object({
          email: z.string().email(),
          displayName: z.string().nullable().describe("Name of the attendee"),
        })
      )
      .nullable()
      .describe("List of attendees"),
    sendNotifications: z
      .boolean()
      .nullable()
      .describe("Send email notifications"),
    calendarId: z
      .string()
      .nullable()
      .describe("Calendar ID (default: primary)"),
    recurrence: z
      .array(z.string())
      .nullable()
      .describe("Recurrence rules (RRULE)"),
  }),
  execute: async (
    params,
    runContext?: RunContext<Tokens[]>
  ): Promise<string> => {
    try {
      if (!runContext) {
        throw new Error("No execution context found (missing tokens)");
      }
      const refreshToken = getRefreshToken(runContext.context);
      const meetService = new GoogleMeetService(refreshToken);

      const startDate = new Date(params.startTime);
      const endDate = new Date(params.endTime);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return JSON.stringify({
          success: false,
          error: "Invalid date format. Use ISO 8601 format.",
        });
      }

      // Convert nulls to undefined for the service call
      const formattedAttendees = params.attendees
        ? params.attendees.map((a) => ({
            email: a.email,
            displayName: a.displayName ?? undefined,
          }))
        : undefined;

      const result = await meetService.createMeeting({
        summary: params.summary,
        description: params.description ?? undefined,
        startTime: startDate,
        endTime: endDate,
        timeZone: params.timeZone ?? undefined,
        attendees: formattedAttendees,
        sendNotifications: params.sendNotifications ?? true,
        calendarId: params.calendarId || "primary",
        recurrence: params.recurrence ?? undefined,
      });

      const meetLink = meetService.getMeetLink(result);

      return JSON.stringify({
        success: true,
        message: "Meeting created successfully",
        data: {
          eventId: result.id,
          htmlLink: result.htmlLink,
          meetLink: meetLink,
          summary: result.summary,
          start: result.start,
          end: result.end,
          attendees: result.attendees,
          status: result.status,
        },
      });
    } catch (error: any) {
      console.error("Error creating meeting:", error);
      return JSON.stringify({
        success: false,
        error: error?.message || "Failed to create meeting",
        details: error?.stack,
      });
    }
  },
});

// ------------------------------------------------------------------
// Get Meeting Tool
// ------------------------------------------------------------------
export const getMeetingTool = tool({
  name: "get_meeting",
  description: `
Get details of a specific Google Meet meeting by event ID.
  `,
  parameters: z.object({
    eventId: z.string().min(1).describe("Calendar event ID"),
    calendarId: z
      .string()
      .nullable()
      .describe("Calendar ID (default: primary)"),
  }),
  execute: async (
    params,
    runContext?: RunContext<Tokens[]>
  ): Promise<string> => {
    try {
      if (!runContext) {
        throw new Error("No execution context found");
      }
      const refreshToken = getRefreshToken(runContext.context);
      const meetService = new GoogleMeetService(refreshToken);

      const result = await meetService.getMeeting(
        params.eventId,
        params.calendarId ?? "primary"
      );

      const meetLink = meetService.getMeetLink(result);
      const phoneNumbers = meetService.getMeetingPhoneNumbers(result);

      return JSON.stringify({
        success: true,
        data: {
          eventId: result.id,
          summary: result.summary,
          description: result.description,
          start: result.start,
          end: result.end,
          attendees: result.attendees,
          meetLink: meetLink,
          phoneNumbers: phoneNumbers,
          status: result.status,
          htmlLink: result.htmlLink,
          created: result.created,
          updated: result.updated,
          organizer: result.organizer,
          recurrence: result.recurrence,
        },
      });
    } catch (error: any) {
      console.error("Error getting meeting:", error);
      return JSON.stringify({
        success: false,
        error: error?.message || "Failed to get meeting",
        details: error?.stack,
      });
    }
  },
});

// ------------------------------------------------------------------
// List Meetings Tool
// ------------------------------------------------------------------
export const listMeetingsTool = tool({
  name: "list_meetings",
  description: `
List Google Meet meetings from calendar with optional filters.
  `,
  parameters: z.object({
    calendarId: z
      .string()
      .nullable()
      .describe("Calendar ID (default: primary)"),
    timeMin: z.string().nullable().describe("Minimum time (ISO 8601)"),
    timeMax: z.string().nullable().describe("Maximum time (ISO 8601)"),
    maxResults: z
      .number()
      .int()
      .nullable()
      .describe("Maximum results (default: 100)"),
    pageToken: z.string().nullable().describe("Pagination token"),
    query: z.string().nullable().describe("Search query"),
    singleEvents: z
      .boolean()
      .nullable()
      .describe("Expand recurring events (default: true)"),
    orderBy: z
      .enum(["startTime", "updated"])
      .nullable()
      .describe("Sort order (default: startTime)"),
  }),
  execute: async (
    params,
    runContext?: RunContext<Tokens[]>
  ): Promise<string> => {
    try {
      if (!runContext) {
        throw new Error("No execution context found");
      }
      const refreshToken = getRefreshToken(runContext.context);
      const meetService = new GoogleMeetService(refreshToken);

      const timeMin = params.timeMin ? new Date(params.timeMin) : undefined;
      const timeMax = params.timeMax ? new Date(params.timeMax) : undefined;

      const result = await meetService.listMeetings({
        calendarId: params.calendarId ?? "primary",
        timeMin,
        timeMax,
        maxResults: params.maxResults ?? 100,
        pageToken: params.pageToken ?? undefined,
        q: params.query ?? undefined,
        singleEvents: params.singleEvents ?? true,
        orderBy: params.orderBy ?? "startTime",
      });

      const meetings = (result.items || []).map((event) => ({
        eventId: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        attendees: event.attendees,
        meetLink: meetService.getMeetLink(event),
        status: event.status,
        htmlLink: event.htmlLink,
        organizer: event.organizer,
      }));

      return JSON.stringify({
        success: true,
        data: {
          meetings,
          nextPageToken: result.nextPageToken,
          summary: result.summary,
          description: result.description,
          timeZone: result.timeZone,
        },
      });
    } catch (error: any) {
      console.error("Error listing meetings:", error);
      return JSON.stringify({
        success: false,
        error: error?.message || "Failed to list meetings",
        details: error?.stack,
      });
    }
  },
});

// ------------------------------------------------------------------
// Update Meeting Tool
// ------------------------------------------------------------------
export const updateMeetingTool = tool({
  name: "update_meeting",
  description: `
Update an existing Google Meet meeting.
  `,
  parameters: z.object({
    eventId: z.string().min(1).describe("Calendar event ID"),
    summary: z.string().nullable().describe("Meeting title"),
    description: z.string().nullable().describe("Meeting description"),
    startTime: z.string().nullable().describe("Start time (ISO 8601)"),
    endTime: z.string().nullable().describe("End time (ISO 8601)"),
    timeZone: z.string().nullable().describe("IANA timezone"),
    attendees: z
      .array(
        z.object({
          email: z.string().email(),
          displayName: z.string().nullable(),
        })
      )
      .nullable()
      .describe("List of attendees"),
    calendarId: z
      .string()
      .nullable()
      .describe("Calendar ID (default: primary)"),
    sendNotifications: z
      .boolean()
      .nullable()
      .describe("Send notifications (default: true)"),
    recurrence: z.array(z.string()).nullable().describe("Recurrence rules"),
  }),
  execute: async (
    params,
    runContext?: RunContext<Tokens[]>
  ): Promise<string> => {
    try {
      if (!runContext) {
        throw new Error("No execution context found");
      }
      const refreshToken = getRefreshToken(runContext.context);
      const meetService = new GoogleMeetService(refreshToken);

      const updates: any = {
        calendarId: params.calendarId ?? "primary",
        sendNotifications: params.sendNotifications ?? true,
      };

      if (params.summary !== null) updates.summary = params.summary;
      if (params.description !== null) updates.description = params.description;
      if (params.timeZone !== null) updates.timeZone = params.timeZone;
      if (params.attendees !== null) updates.attendees = params.attendees;
      if (params.recurrence !== null) updates.recurrence = params.recurrence;

      if (params.startTime) {
        const startDate = new Date(params.startTime);
        if (isNaN(startDate.getTime())) {
          return JSON.stringify({
            success: false,
            error: "Invalid startTime format. Use ISO 8601 format.",
          });
        }
        updates.startTime = startDate;
      }

      if (params.endTime) {
        const endDate = new Date(params.endTime);
        if (isNaN(endDate.getTime())) {
          return JSON.stringify({
            success: false,
            error: "Invalid endTime format. Use ISO 8601 format.",
          });
        }
        updates.endTime = endDate;
      }

      const result = await meetService.updateMeeting(params.eventId, updates);
      const meetLink = meetService.getMeetLink(result);

      return JSON.stringify({
        success: true,
        message: "Meeting updated successfully",
        data: {
          eventId: result.id,
          summary: result.summary,
          start: result.start,
          end: result.end,
          meetLink: meetLink,
          status: result.status,
          htmlLink: result.htmlLink,
          updated: result.updated,
        },
      });
    } catch (error: any) {
      console.error("Error updating meeting:", error);
      return JSON.stringify({
        success: false,
        error: error?.message || "Failed to update meeting",
        details: error?.stack,
      });
    }
  },
});

// ------------------------------------------------------------------
// Delete Meeting Tool
// ------------------------------------------------------------------
export const deleteMeetingTool = tool({
  name: "delete_meeting",
  description: `
PERMANENTLY delete a Google Meet meeting.
  `,
  parameters: z.object({
    eventId: z.string().min(1).describe("Calendar event ID"),
    calendarId: z
      .string()
      .nullable()
      .describe("Calendar ID (default: primary)"),
    sendNotifications: z
      .boolean()
      .nullable()
      .describe("Send notifications (default: true)"),
  }),
  needsApproval: true,
  execute: async (
    params,
    runContext?: RunContext<Tokens[]>
  ): Promise<string> => {
    try {
      if (!runContext) {
        throw new Error("No execution context found");
      }
      const refreshToken = getRefreshToken(runContext.context);
      const meetService = new GoogleMeetService(refreshToken);

      await meetService.deleteMeeting(params.eventId, {
        calendarId: params.calendarId ?? "primary",
        sendNotifications: params.sendNotifications ?? true,
      });

      return JSON.stringify({
        success: true,
        message: "Meeting deleted successfully",
        data: { eventId: params.eventId },
      });
    } catch (error: any) {
      console.error("Error deleting meeting:", error);
      return JSON.stringify({
        success: false,
        error: error?.message || "Failed to delete meeting",
        details: error?.stack,
      });
    }
  },
});

// ------------------------------------------------------------------
// Cancel Meeting Tool
// ------------------------------------------------------------------
export const cancelMeetingTool = tool({
  name: "cancel_meeting",
  description: `
Cancel a Google Meet meeting (soft delete).
  `,
  parameters: z.object({
    eventId: z.string().min(1).describe("Calendar event ID"),
    calendarId: z
      .string()
      .nullable()
      .describe("Calendar ID (default: primary)"),
    sendNotifications: z
      .boolean()
      .nullable()
      .describe("Send notifications (default: true)"),
  }),
  execute: async (
    params,
    runContext?: RunContext<Tokens[]>
  ): Promise<string> => {
    try {
      if (!runContext) {
        throw new Error("No execution context found");
      }
      const refreshToken = getRefreshToken(runContext.context);
      const meetService = new GoogleMeetService(refreshToken);

      const result = await meetService.cancelMeeting(params.eventId, {
        calendarId: params.calendarId ?? "primary",
        sendNotifications: params.sendNotifications ?? true,
      });

      return JSON.stringify({
        success: true,
        message: "Meeting cancelled successfully",
        data: {
          eventId: result.id,
          status: result.status,
        },
      });
    } catch (error: any) {
      console.error("Error cancelling meeting:", error);
      return JSON.stringify({
        success: false,
        error: error?.message || "Failed to cancel meeting",
        details: error?.stack,
      });
    }
  },
});

// ------------------------------------------------------------------
// Add Attendees Tool
// ------------------------------------------------------------------
export const addAttendeesTool = tool({
  name: "add_attendees",
  description: `
Add new attendees to an existing Google Meet meeting.
  `,
  parameters: z.object({
    eventId: z.string().min(1).describe("Calendar event ID"),
    attendees: z
      .array(
        z.object({
          email: z.string().email(),
          displayName: z.string().nullable(),
        })
      )
      .min(1)
      .describe("List of attendees to add"),
    calendarId: z
      .string()
      .nullable()
      .describe("Calendar ID (default: primary)"),
    sendNotifications: z
      .boolean()
      .nullable()
      .describe("Send notifications (default: true)"),
  }),
  execute: async (
    params,
    runContext?: RunContext<Tokens[]>
  ): Promise<string> => {
    try {
      if (!runContext) {
        throw new Error("No execution context found");
      }
      const refreshToken = getRefreshToken(runContext.context);
      const meetService = new GoogleMeetService(refreshToken);

      // Map nullable fields to undefined if needed inside objects
      const safeAttendees = params.attendees.map((a) => ({
        email: a.email,
        displayName: a.displayName ?? undefined,
      }));

      const result = await meetService.addAttendees(
        params.eventId,
        safeAttendees,
        {
          calendarId: params.calendarId ?? "primary",
          sendNotifications: params.sendNotifications ?? true,
        }
      );

      return JSON.stringify({
        success: true,
        message: `Successfully added ${params.attendees.length} attendee(s)`,
        data: {
          eventId: result.id,
          attendees: result.attendees,
        },
      });
    } catch (error: any) {
      console.error("Error adding attendees:", error);
      return JSON.stringify({
        success: false,
        error: error?.message || "Failed to add attendees",
        details: error?.stack,
      });
    }
  },
});

// ------------------------------------------------------------------
// Remove Attendees Tool
// ------------------------------------------------------------------
export const removeAttendeesTool = tool({
  name: "remove_attendees",
  description: `
Remove attendees from an existing Google Meet meeting.
  `,
  parameters: z.object({
    eventId: z.string().min(1).describe("Calendar event ID"),
    attendeeEmails: z
      .array(z.string().email())
      .min(1)
      .describe("Emails of attendees to remove"),
    calendarId: z
      .string()
      .nullable()
      .describe("Calendar ID (default: primary)"),
    sendNotifications: z
      .boolean()
      .nullable()
      .describe("Send notifications (default: true)"),
  }),
  execute: async (
    params,
    runContext?: RunContext<Tokens[]>
  ): Promise<string> => {
    try {
      if (!runContext) {
        throw new Error("No execution context found");
      }
      const refreshToken = getRefreshToken(runContext.context);
      const meetService = new GoogleMeetService(refreshToken);

      const result = await meetService.removeAttendees(
        params.eventId,
        params.attendeeEmails,
        {
          calendarId: params.calendarId ?? "primary",
          sendNotifications: params.sendNotifications ?? true,
        }
      );

      return JSON.stringify({
        success: true,
        message: `Successfully removed ${params.attendeeEmails.length} attendee(s)`,
        data: {
          eventId: result.id,
          attendees: result.attendees,
        },
      });
    } catch (error: any) {
      console.error("Error removing attendees:", error);
      return JSON.stringify({
        success: false,
        error: error?.message || "Failed to remove attendees",
        details: error?.stack,
      });
    }
  },
});

// ------------------------------------------------------------------
// Quick Create Meeting Tool
// ------------------------------------------------------------------
export const quickCreateMeetingTool = tool({
  name: "quick_create_meeting",
  description: `
Quick create a meeting using natural language text.
  `,
  parameters: z.object({
    text: z.string().min(1).describe("Natural language meeting description"),
    calendarId: z
      .string()
      .nullable()
      .describe("Calendar ID (default: primary)"),
    sendNotifications: z
      .boolean()
      .nullable()
      .describe("Send notifications (default: true)"),
  }),
  execute: async (
    params,
    runContext?: RunContext<Tokens[]>
  ): Promise<string> => {
    try {
      if (!runContext) {
        throw new Error("No execution context found");
      }
      const refreshToken = getRefreshToken(runContext.context);
      const meetService = new GoogleMeetService(refreshToken);

      const result = await meetService.quickCreateMeeting(params.text, {
        calendarId: params.calendarId ?? "primary",
        sendNotifications: params.sendNotifications ?? true,
      });

      const meetLink = meetService.getMeetLink(result);

      return JSON.stringify({
        success: true,
        message: "Meeting created successfully",
        data: {
          eventId: result.id,
          summary: result.summary,
          start: result.start,
          end: result.end,
          meetLink: meetLink,
          htmlLink: result.htmlLink,
        },
      });
    } catch (error: any) {
      console.error("Error quick creating meeting:", error);
      return JSON.stringify({
        success: false,
        error: error?.message || "Failed to quick create meeting",
        details: error?.stack,
      });
    }
  },
});

// ------------------------------------------------------------------
// List Calendars Tool
// ------------------------------------------------------------------
export const listCalendarsTool = tool({
  name: "list_calendars",
  description: `
List all available calendars for the user.
  `,
  parameters: z.object({
    maxResults: z
      .number()
      .int()
      .nullable()
      .describe("Maximum results (default: 100)"),
    pageToken: z.string().nullable().describe("Pagination token"),
    showHidden: z
      .boolean()
      .nullable()
      .describe("Show hidden calendars (default: false)"),
    showDeleted: z
      .boolean()
      .nullable()
      .describe("Show deleted calendars (default: false)"),
  }),
  execute: async (
    params,
    runContext?: RunContext<Tokens[]>
  ): Promise<string> => {
    try {
      if (!runContext) {
        throw new Error("No execution context found");
      }
      const refreshToken = getRefreshToken(runContext.context);
      const meetService = new GoogleMeetService(refreshToken);

      const result = await meetService.listCalendars({
        maxResults: params.maxResults ?? 100,
        pageToken: params.pageToken ?? undefined,
        showHidden: params.showHidden ?? false,
        showDeleted: params.showDeleted ?? false,
      });

      const calendars = (result.items || []).map((calendar) => ({
        id: calendar.id,
        summary: calendar.summary,
        description: calendar.description,
        timeZone: calendar.timeZone,
        primary: calendar.primary,
        accessRole: calendar.accessRole,
        backgroundColor: calendar.backgroundColor,
        foregroundColor: calendar.foregroundColor,
      }));

      return JSON.stringify({
        success: true,
        data: {
          calendars,
          nextPageToken: result.nextPageToken,
        },
      });
    } catch (error: any) {
      console.error("Error listing calendars:", error);
      return JSON.stringify({
        success: false,
        error: error?.message || "Failed to list calendars",
        details: error?.stack,
      });
    }
  },
});

// ------------------------------------------------------------------
// Get Calendar Tool
// ------------------------------------------------------------------
export const getCalendarTool = tool({
  name: "get_calendar",
  description: `
Get details of a specific calendar.
  `,
  parameters: z.object({
    calendarId: z
      .string()
      .nullable()
      .describe("Calendar ID (default: primary)"),
  }),
  execute: async (
    params,
    runContext?: RunContext<Tokens[]>
  ): Promise<string> => {
    try {
      if (!runContext) {
        throw new Error("No execution context found");
      }
      const refreshToken = getRefreshToken(runContext.context);
      const meetService = new GoogleMeetService(refreshToken);

      const result = await meetService.getCalendar(
        params.calendarId ?? "primary"
      );

      return JSON.stringify({
        success: true,
        data: {
          id: result.id,
          summary: result.summary,
          description: result.description,
          timeZone: result.timeZone,
          location: result.location,
        },
      });
    } catch (error: any) {
      console.error("Error getting calendar:", error);
      return JSON.stringify({
        success: false,
        error: error?.message || "Failed to get calendar",
        details: error?.stack,
      });
    }
  },
});

// ------------------------------------------------------------------
// Move Meeting Tool
// ------------------------------------------------------------------
export const moveMeetingTool = tool({
  name: "move_meeting",
  description: `
Move a meeting to a different calendar.
  `,
  parameters: z.object({
    eventId: z.string().min(1).describe("Calendar event ID"),
    sourceCalendarId: z.string().min(1).describe("Source calendar ID"),
    destinationCalendarId: z
      .string()
      .min(1)
      .describe("Destination calendar ID"),
    sendNotifications: z
      .boolean()
      .nullable()
      .describe("Send notifications (default: true)"),
  }),
  execute: async (
    params,
    runContext?: RunContext<Tokens[]>
  ): Promise<string> => {
    try {
      if (!runContext) {
        throw new Error("No execution context found");
      }
      const refreshToken = getRefreshToken(runContext.context);
      const meetService = new GoogleMeetService(refreshToken);

      const result = await meetService.moveMeeting(
        params.eventId,
        params.sourceCalendarId,
        params.destinationCalendarId,
        params.sendNotifications ?? true
      );

      return JSON.stringify({
        success: true,
        message: "Meeting moved successfully",
        data: {
          eventId: result.id,
          summary: result.summary,
          organizer: result.organizer,
        },
      });
    } catch (error: any) {
      console.error("Error moving meeting:", error);
      return JSON.stringify({
        success: false,
        error: error?.message || "Failed to move meeting",
        details: error?.stack,
      });
    }
  },
});
