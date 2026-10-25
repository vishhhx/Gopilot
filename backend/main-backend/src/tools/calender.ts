


import { tool } from "@openai/agents";
import { z } from "zod";
import { CalendarService } from "../utils/google/calender";
import { RunContext } from "@openai/agents";

// ─────────────────────────────────────────────────────────
// TOKEN HELPER - Gmail Style
// ─────────────────────────────────────────────────────────
// function getRefreshToken(tokens: any[]) {
//   console.log("🔍 Tokens received:", tokens);

//   const res = tokens.filter((token) => token.service === "calendar");

//   if (res.length <= 0) {
//     throw new Error("No refresh token for calendar service found");
//   }

//   return res[0].refreshToken;
// }
function getRefreshToken(tokens: any) {

  // If tokens is an array
  if (Array.isArray(tokens)) {
    const res = tokens.filter((token) => token.service === "calendar");
    if (res.length <= 0) {
      throw new Error("No refresh token for calendar service found");
    }
    return res[0].refreshToken;
  }

  // If tokens is an object
  if (tokens.calendar?.refreshToken) {
    return tokens.calendar.refreshToken;
  }

  throw new Error("No refresh token for calendar service found");
}

// ─────────────────────────────────────────────────────────
// LIST CALENDAR EVENTS TOOL
// ─────────────────────────────────────────────────────────
export const listCalendarEventsTool = tool({
  name: "list_calendar_events",
  description: `
Get a list of calendar events from Google Calendar.
Parameters:
- maxResults: Number of events to return (1-50, default: 10). Always provide this, use 10 if not specified.
- timeMin: Lower bound for event start time (RFC 3339 format, e.g. 2024-01-01T00:00:00Z). Use empty string "" if not specified.
- timeMax: Upper bound for event start time (RFC 3339 format). Use empty string "" if not specified.
- q: Search query for event titles/descriptions. Use empty string "" if no search query.
  `,
  parameters: z.object({
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(50)
      .describe("Number of events to return (1-50, default: 10)"),
    timeMin: z
      .string()
      .describe("Lower bound for event start time or empty string"),
    timeMax: z
      .string()
      .describe("Upper bound for event start time or empty string"),
    q: z.string().describe("Search query or empty string"),
  }),
  execute: async (
    { maxResults, timeMin, timeMax, q },
    runContext?: RunContext<any[]>
  ) => {
    let calendar: CalendarService | null = null;

    try {
      console.log("🔄 Fetching calendar events...");

      if (runContext === undefined) {
        throw new Error("No refresh token of the calendar found");
      }

      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      calendar = new CalendarService(refreshToken);

      const result = await calendar.listEvents({
        maxResults: maxResults || 10,
        timeMin: timeMin || undefined,
        timeMax: timeMax || undefined,
        q: q || undefined,
      });

      if (!result || result.length === 0) {
        return {
          success: true,
          message: "No events found matching the criteria",
          data: {
            events: [],
            count: 0,
          },
        };
      }

      return {
        success: true,
        data: {
          events: result,
          count: result.length,
        },
      };
    } catch (error: any) {
      console.error("Error listing calendar events:", error);
      return {
        success: false,
        error: error?.message || "Failed to list calendar events",
        details: error?.stack,
      };
    } finally {
      if (calendar) {
        await calendar.cleanup();
      }
    }
  },
});

// ─────────────────────────────────────────────────────────
// GET SINGLE EVENT TOOL
// ─────────────────────────────────────────────────────────
export const getCalendarEventTool = tool({
  name: "get_calendar_event",
  description: `
Get details of a specific calendar event.
Parameters:
- eventId: The ID of the event to retrieve (required).
- calendarId: Calendar ID (default: "primary").
  `,
  parameters: z.object({
    eventId: z.string().describe("The ID of the event to retrieve"),
    calendarId: z
      .string()
      .optional()
      .default("primary")
      .describe("Calendar ID (default: primary)"),
  }),
  execute: async (
    { eventId, calendarId },
    runContext?: RunContext<any[]>
  ) => {
    let calendar: CalendarService | null = null;

    try {
      console.log(`🔄 Fetching event: ${eventId}...`);

      if (runContext === undefined) {
        throw new Error("No refresh token of the calendar found");
      }

      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      calendar = new CalendarService(refreshToken);

      const event = await calendar.getEvent(calendarId || "primary", eventId);

      return {
        success: true,
        data: event,
      };
    } catch (error: any) {
      console.error("Error getting calendar event:", error);
      return {
        success: false,
        error: error?.message || "Failed to get calendar event",
        details: error?.stack,
      };
    } finally {
      if (calendar) {
        await calendar.cleanup();
      }
    }
  },
});

// ─────────────────────────────────────────────────────────
// CREATE CALENDAR EVENT TOOL
// ─────────────────────────────────────────────────────────
// export const createCalendarEventTool = tool({
//   name: "create_calendar_event",
//   description: `
// Create a new event on Google Calendar.
// Parameters:
// - summary: Event title/summary (required).
// - description: Event description (optional, use empty string "" if not provided).
// - startDateTime: Event start time in RFC 3339 format (required, e.g. 2024-01-15T10:00:00Z).
// - endDateTime: Event end time in RFC 3339 format (required, e.g. 2024-01-15T11:00:00Z).
// - timeZone: Time zone for the event (default: "UTC").
// - attendees: Array of attendee email addresses (optional, use [] if not provided).
// - calendarId: Calendar ID (default: "primary").
//   `,
//   parameters: z.object({
//     summary: z.string().describe("Event title/summary"),
//     description: z
//       .string()
//       .optional()
//       .describe("Event description or empty string"),
//     startDateTime: z
//       .string()
//       .describe("Event start time in RFC 3339 format"),
//     endDateTime: z
//       .string()
//       .describe("Event end time in RFC 3339 format"),
//     timeZone: z
//       .string()
//       .optional()
//       .default("UTC")
//       .describe("Time zone for the event"),
//     attendees: z
//       .array(z.string().email())
//       .optional()
//       .describe("Array of attendee emails or empty array"),
//     calendarId: z
//       .string()
//       .optional()
//       .default("primary")
//       .describe("Calendar ID (default: primary)"),
//   }),
//   execute: async (
//     {
//       summary,
//       description,
//       startDateTime,
//       endDateTime,
//       timeZone,
//       attendees,
//       calendarId,
//     },
//     runContext?: RunContext<any[]>
//   ) => {
//     let calendar: CalendarService | null = null;

//     try {
//       console.log(`🔄 Creating calendar event: ${summary}...`);

//       if (runContext === undefined) {
//         throw new Error("No refresh token of the calendar found");
//       }

//       const refreshToken = getRefreshToken(runContext.context);

//       if (!refreshToken) {
//         return {
//           success: false,
//           error: "Missing refresh token in context.",
//         };
//       }

//       calendar = new CalendarService(refreshToken);

//       const event = await calendar.createEvent({
//         calendarId: calendarId || "primary",
//         summary,
//         description: description || undefined,
//         start: {
//           dateTime: startDateTime,
//           timeZone: timeZone || "UTC",
//         },
//         end: {
//           dateTime: endDateTime,
//           timeZone: timeZone || "UTC",
//         },
//         attendees: attendees?.map((email) => ({ email })),
//       });

//       return {
//         success: true,
//         data: event,
//         eventId: event.id,
//       };
//     } catch (error: any) {
//       console.error("Error creating calendar event:", error);
//       return {
//         success: false,
//         error: error?.message || "Failed to create calendar event",
//         details: error?.stack,
//       };
//     } finally {
//       if (calendar) {
//         await calendar.cleanup();
//       }
//     }
//   },
// });
export const createCalendarEventTool = tool({
  name: "create_calendar_event",
  description: `
Create a new event on Google Calendar.
Parameters:
- summary: Event title/summary (required).
- description: Event description (optional, use empty string "" if not provided).
- startDateTime: Event start time in RFC 3339 format (required, e.g. 2024-01-15T10:00:00Z).
- endDateTime: Event end time in RFC 3339 format (required, e.g. 2024-01-15T11:00:00Z).
- timeZone: Time zone for the event (default: "UTC").
- attendees: Array of attendee email addresses (optional, use [] if not provided).
- calendarId: Calendar ID (default: "primary").
  `,
  parameters: z.object({
    summary: z.string().describe("Event title/summary"),
    description: z
      .string()
      .optional()
      .default("") // default to empty string to satisfy schema
      .describe("Event description or empty string"),
    startDateTime: z
      .string()
      .describe("Event start time in RFC 3339 format"),
    endDateTime: z
      .string()
      .describe("Event end time in RFC 3339 format"),
    timeZone: z
      .string()
      .optional()
      .default("UTC")
      .describe("Time zone for the event"),
    attendees: z
      .array(z.string().email())
      .optional()
      .default([]) // default to empty array to satisfy schema
      .describe("Array of attendee emails or empty array"),
    calendarId: z
      .string()
      .optional()
      .default("primary")
      .describe("Calendar ID (default: primary)"),
  }),
  execute: async (
    {
      summary,
      description,
      startDateTime,
      endDateTime,
      timeZone,
      attendees,
      calendarId,
    },
    runContext?: RunContext<any[]>
  ) => {
    let calendar: CalendarService | null = null;

    try {
      console.log(`🔄 Creating calendar event: ${summary}...`);

      if (!runContext) {
        throw new Error("No refresh token of the calendar found in context");
      }

      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      calendar = new CalendarService(refreshToken);

      const event = await calendar.createEvent({
        calendarId: calendarId,
        summary,
        description, // always a string (default "")
        start: {
          dateTime: startDateTime,
          timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone,
        },
        attendees: attendees.map((email) => ({ email })),
      });

      return {
        success: true,
        data: event,
        eventId: event.id,
      };
    } catch (error: any) {
      console.error("Error creating calendar event:", error);
      return {
        success: false,
        error: error?.message || "Failed to create calendar event",
        details: error?.stack,
      };
    } finally {
      if (calendar) {
        await calendar.cleanup();
      }
    }
  },
});

// ─────────────────────────────────────────────────────────
// UPDATE CALENDAR EVENT TOOL
// ─────────────────────────────────────────────────────────
// export const updateCalendarEventTool = tool({
//   name: "update_calendar_event",
//   description: `
// Update an existing calendar event.
// Parameters:
// - eventId: The ID of the event to update (required).
// - summary: New event title (optional, use empty string "" if not updating).
// - description: New event description (optional, use empty string "" if not updating).
// - startDateTime: New start time in RFC 3339 format (optional).
// - endDateTime: New end time in RFC 3339 format (optional).
// - timeZone: Time zone for the event (optional).
// - calendarId: Calendar ID (default: "primary").
//   `,
//   parameters: z.object({
//     eventId: z.string().describe("The ID of the event to update"),
//     summary: z
//       .string()
//       .optional()
//       .describe("New event title or empty string"),
//     description: z
//       .string()
//       .optional()
//       .describe("New event description or empty string"),
//     startDateTime: z
//       .string()
//       .optional()
//       .describe("New start time in RFC 3339 format"),
//     endDateTime: z
//       .string()
//       .optional()
//       .describe("New end time in RFC 3339 format"),
//     timeZone: z.string().optional().describe("Time zone"),
//     calendarId: z
//       .string()
//       .optional()
//       .default("primary")
//       .describe("Calendar ID"),
//   }),
//   execute: async (
//     {
//       eventId,
//       summary,
//       description,
//       startDateTime,
//       endDateTime,
//       timeZone,
//       calendarId,
//     },
//     runContext?: RunContext<any[]>
//   ) => {
//     let calendar: CalendarService | null = null;

//     try {
//       console.log(`🔄 Updating calendar event: ${eventId}...`);

//       if (runContext === undefined) {
//         throw new Error("No refresh token of the calendar found");
//       }

//       const refreshToken = getRefreshToken(runContext.context);

//       if (!refreshToken) {
//         return {
//           success: false,
//           error: "Missing refresh token in context.",
//         };
//       }

//       calendar = new CalendarService(refreshToken);

//       const event = await calendar.updateEvent({
//         calendarId: calendarId || "primary",
//         eventId,
//         summary: summary || undefined,
//         description: description || undefined,
//         start: startDateTime
//           ? {
//             dateTime: startDateTime,
//             timeZone: timeZone || "UTC",
//           }
//           : undefined,
//         end: endDateTime
//           ? {
//             dateTime: endDateTime,
//             timeZone: timeZone || "UTC",
//           }
//           : undefined,
//       });

//       return {
//         success: true,
//         data: event,
//       };
//     } catch (error: any) {
//       console.error("Error updating calendar event:", error);
//       return {
//         success: false,
//         error: error?.message || "Failed to update calendar event",
//         details: error?.stack,
//       };
//     } finally {
//       if (calendar) {
//         await calendar.cleanup();
//       }
//     }
//   },
// });
export const updateCalendarEventTool = tool({
  name: "update_calendar_event",
  description: "Update an existing calendar event. Only provide fields you want to change.",
  parameters: z.object({
    eventId: z.string().describe("The ID of the event to update (required)"),
    summary: z
      .string()
      .optional()
      .nullable()
      .describe("New event title"),
    description: z
      .string()
      .optional()
      .nullable()
      .describe("New event description"),
    startDateTime: z
      .string()
      .optional()
      .nullable()
      .describe("New start time in RFC 3339 format"),
    endDateTime: z
      .string()
      .optional()
      .nullable()
      .describe("New end time in RFC 3339 format"),
    timeZone: z
      .string()
      .optional()
      .nullable()
      .describe("Time zone for the event"),
    calendarId: z
      .string()
      .optional()
      .nullable()
      .default("primary")
      .describe("Calendar ID"),
  }),
  execute: async (
    {
      eventId,
      summary,
      description,
      startDateTime,
      endDateTime,
      timeZone,
      calendarId,
    },
    runContext?: RunContext<any[]>
  ) => {
    let calendar: CalendarService | null = null;

    try {
      console.log(`🔄 Updating calendar event: ${eventId}...`);

      if (runContext === undefined) {
        throw new Error("No refresh token of the calendar found");
      }

      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      calendar = new CalendarService(refreshToken);

      const event = await calendar.updateEvent({
        calendarId: calendarId || "primary",
        eventId,
        summary: summary || undefined,
        description: description || undefined,
        start: startDateTime
          ? {
              dateTime: startDateTime,
              timeZone: timeZone || "UTC",
            }
          : undefined,
        end: endDateTime
          ? {
              dateTime: endDateTime,
              timeZone: timeZone || "UTC",
            }
          : undefined,
      });

      return {
        success: true,
        data: event,
      };
    } catch (error: any) {
      console.error("Error updating calendar event:", error);
      return {
        success: false,
        error: error?.message || "Failed to update calendar event",
      };
    } finally {
      if (calendar) {
        await calendar.cleanup();
      }
    }
  },
});

// ─────────────────────────────────────────────────────────
// DELETE CALENDAR EVENT TOOL
// ─────────────────────────────────────────────────────────
export const deleteCalendarEventTool = tool({
  name: "delete_calendar_event",
  description: `
Delete a calendar event.
Parameters:
- eventId: The ID of the event to delete (required).
- calendarId: Calendar ID (default: "primary").
  `,
  parameters: z.object({
    eventId: z.string().describe("The ID of the event to delete"),
    calendarId: z
      .string()
      .optional()
      .default("primary")
      .describe("Calendar ID"),
  }),
  execute: async (
    { eventId, calendarId },
    runContext?: RunContext<any[]>
  ) => {
    let calendar: CalendarService | null = null;

    try {
      console.log(`🔄 Deleting calendar event: ${eventId}...`);

      if (runContext === undefined) {
        throw new Error("No refresh token of the calendar found");
      }

      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      calendar = new CalendarService(refreshToken);

      await calendar.deleteEvent(calendarId || "primary", eventId);

      return {
        success: true,
        message: `Event ${eventId} deleted successfully`,
      };
    } catch (error: any) {
      console.error("Error deleting calendar event:", error);
      return {
        success: false,
        error: error?.message || "Failed to delete calendar event",
        details: error?.stack,
      };
    } finally {
      if (calendar) {
        await calendar.cleanup();
      }
    }
  },
});

// ─────────────────────────────────────────────────────────
// QUICK ADD EVENT TOOL
// ─────────────────────────────────────────────────────────
export const quickAddCalendarEventTool = tool({
  name: "quick_add_calendar_event",
  description: `
Quickly add an event using natural language.
Parameters:
- text: Natural language description (e.g., "Meeting tomorrow at 2pm"). Required.
- calendarId: Calendar ID (default: "primary").
  `,
  parameters: z.object({
    text: z
      .string()
      .describe("Natural language description (e.g., 'Meeting tomorrow at 2pm')"),
    calendarId: z
      .string()
      .optional()
      .default("primary")
      .describe("Calendar ID"),
  }),
  execute: async (
    { text, calendarId },
    runContext?: RunContext<any[]>
  ) => {
    let calendar: CalendarService | null = null;

    try {
      console.log(`🔄 Quick adding event: "${text}"...`);

      if (runContext === undefined) {
        throw new Error("No refresh token of the calendar found");
      }

      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      calendar = new CalendarService(refreshToken);

      const event = await calendar.quickAdd({
        calendarId: calendarId || "primary",
        text,
      });

      return {
        success: true,
        data: event,
        eventId: event.id,
      };
    } catch (error: any) {
      console.error("Error quick adding calendar event:", error);
      return {
        success: false,
        error: error?.message || "Failed to quick add calendar event",
        details: error?.stack,
      };
    } finally {
      if (calendar) {
        await calendar.cleanup();
      }
    }
  },
});