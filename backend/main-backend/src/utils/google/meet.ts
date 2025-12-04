import { google } from "googleapis";
import { ENV } from "../../config";
import { calendar_v3 } from "googleapis";

export class GoogleMeetService {
  private oauth2Client;
  private calendar: calendar_v3.Calendar;

  constructor(refreshToken: string) {
    if (
      !ENV.GOOGLE_CLIENT_ID ||
      !ENV.GOOGLE_CLIENT_SECRET ||
      !ENV.GOOGLE_REDIRECT_URI
    ) {
      throw new Error(
        "Google API credentials are missing in environment variables."
      );
    }

    this.oauth2Client = new google.auth.OAuth2(
      ENV.GOOGLE_CLIENT_ID,
      ENV.GOOGLE_CLIENT_SECRET,
      ENV.GOOGLE_REDIRECT_URI
    );

    if (!refreshToken) {
      throw new Error("No required credentials are provided");
    }

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    this.calendar = google.calendar({ version: "v3", auth: this.oauth2Client });
  }

  // Utils
  private generateRequestId(): string {
    return `meet_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private formatDateTime(
    date: Date,
    timeZone?: string
  ): calendar_v3.Schema$EventDateTime {
    return {
      dateTime: date.toISOString(),
      timeZone: timeZone || "UTC",
    };
  }

  // Create Meeting
  async createMeeting(options: {
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    timeZone?: string;
    attendees?: Array<{
      email: string;
      displayName?: string;
      responseStatus?: string;
    }>;
    sendNotifications?: boolean;
    calendarId?: string;
    recurrence?: string[];
    reminders?: {
      useDefault?: boolean;
      overrides?: Array<{ method: string; minutes: number }>;
    };
  }) {
    const {
      summary,
      description,
      startTime,
      endTime,
      timeZone,
      attendees,
      sendNotifications = true,
      calendarId = "primary",
      recurrence,
      reminders,
    } = options;

    const event: calendar_v3.Schema$Event = {
      summary,
      description,
      start: this.formatDateTime(startTime, timeZone),
      end: this.formatDateTime(endTime, timeZone),
      attendees: attendees?.map((attendee) => ({
        email: attendee.email,
        displayName: attendee.displayName,
        responseStatus: attendee.responseStatus || "needsAction",
      })),
      conferenceData: {
        createRequest: {
          requestId: this.generateRequestId(),
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
      reminders: reminders || {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 10 },
        ],
      },
    };

    if (recurrence) {
      event.recurrence = recurrence;
    }

    const response = await this.calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      sendUpdates: sendNotifications ? "all" : "none",
      requestBody: event,
    });

    return response.data;
  }

  // Get Meeting Details
  async getMeeting(eventId: string, calendarId: string = "primary") {
    const response = await this.calendar.events.get({
      calendarId,
      eventId,
    });

    return response.data;
  }

  // List Meetings
  async listMeetings(options?: {
    calendarId?: string;
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
    pageToken?: string;
    q?: string;
    singleEvents?: boolean;
    orderBy?: string;
  }) {
    const {
      calendarId = "primary",
      timeMin,
      timeMax,
      maxResults = 100,
      pageToken,
      q,
      singleEvents = true,
      orderBy = "startTime",
    } = options || {};

    const response = await this.calendar.events.list({
      calendarId,
      timeMin: timeMin?.toISOString(),
      timeMax: timeMax?.toISOString(),
      maxResults,
      pageToken,
      q,
      singleEvents,
      orderBy: singleEvents ? orderBy : undefined,
    });

    return response.data;
  }

  // Update Meeting
  async updateMeeting(
    eventId: string,
    updates: {
      summary?: string;
      description?: string;
      startTime?: Date;
      endTime?: Date;
      timeZone?: string;
      attendees?: Array<{
        email: string;
        displayName?: string;
        responseStatus?: string;
      }>;
      calendarId?: string;
      sendNotifications?: boolean;
      recurrence?: string[];
    }
  ) {
    const {
      calendarId = "primary",
      sendNotifications = true,
      ...eventUpdates
    } = updates;

    // First, get the current event
    const currentEvent = await this.getMeeting(eventId, calendarId);

    // Prepare the updated event
    const updatedEvent: calendar_v3.Schema$Event = {
      ...currentEvent,
      ...(eventUpdates.summary && { summary: eventUpdates.summary }),
      ...(eventUpdates.description && {
        description: eventUpdates.description,
      }),
      ...(eventUpdates.startTime && {
        start: this.formatDateTime(
          eventUpdates.startTime,
          eventUpdates.timeZone
        ),
      }),
      ...(eventUpdates.endTime && {
        end: this.formatDateTime(eventUpdates.endTime, eventUpdates.timeZone),
      }),
      ...(eventUpdates.attendees && {
        attendees: eventUpdates.attendees.map((attendee) => ({
          email: attendee.email,
          displayName: attendee.displayName,
          responseStatus: attendee.responseStatus || "needsAction",
        })),
      }),
      ...(eventUpdates.recurrence && { recurrence: eventUpdates.recurrence }),
    };

    const response = await this.calendar.events.update({
      calendarId,
      eventId,
      conferenceDataVersion: 1,
      sendUpdates: sendNotifications ? "all" : "none",
      requestBody: updatedEvent,
    });

    return response.data;
  }

  // Delete Meeting
  async deleteMeeting(
    eventId: string,
    options?: {
      calendarId?: string;
      sendNotifications?: boolean;
    }
  ) {
    const { calendarId = "primary", sendNotifications = true } = options || {};

    await this.calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: sendNotifications ? "all" : "none",
    });

    return { success: true, eventId };
  }

  // Cancel Meeting (soft delete - marks as cancelled)
  async cancelMeeting(
    eventId: string,
    options?: {
      calendarId?: string;
      sendNotifications?: boolean;
    }
  ) {
    const { calendarId = "primary", sendNotifications = true } = options || {};

    const currentEvent = await this.getMeeting(eventId, calendarId);

    const response = await this.calendar.events.update({
      calendarId,
      eventId,
      sendUpdates: sendNotifications ? "all" : "none",
      requestBody: {
        ...currentEvent,
        status: "cancelled",
      },
    });

    return response.data;
  }

  // Add Attendees to Meeting
  async addAttendees(
    eventId: string,
    attendees: Array<{ email: string; displayName?: string }>,
    options?: {
      calendarId?: string;
      sendNotifications?: boolean;
    }
  ) {
    const { calendarId = "primary", sendNotifications = true } = options || {};

    const currentEvent = await this.getMeeting(eventId, calendarId);
    const existingAttendees = currentEvent.attendees || [];

    const newAttendees = attendees.map((attendee) => ({
      email: attendee.email,
      displayName: attendee.displayName,
      responseStatus: "needsAction",
    }));

    const response = await this.calendar.events.update({
      calendarId,
      eventId,
      conferenceDataVersion: 1,
      sendUpdates: sendNotifications ? "all" : "none",
      requestBody: {
        ...currentEvent,
        attendees: [...existingAttendees, ...newAttendees],
      },
    });

    return response.data;
  }

  // Remove Attendees from Meeting
  async removeAttendees(
    eventId: string,
    attendeeEmails: string[],
    options?: {
      calendarId?: string;
      sendNotifications?: boolean;
    }
  ) {
    const { calendarId = "primary", sendNotifications = true } = options || {};

    const currentEvent = await this.getMeeting(eventId, calendarId);
    const existingAttendees = currentEvent.attendees || [];

    const updatedAttendees = existingAttendees.filter(
      (attendee) => !attendeeEmails.includes(attendee.email || "")
    );

    const response = await this.calendar.events.update({
      calendarId,
      eventId,
      conferenceDataVersion: 1,
      sendUpdates: sendNotifications ? "all" : "none",
      requestBody: {
        ...currentEvent,
        attendees: updatedAttendees,
      },
    });

    return response.data;
  }

  // Get Meet Link from Event
  getMeetLink(event: calendar_v3.Schema$Event): string | null {
    return (
      event.hangoutLink ||
      event.conferenceData?.entryPoints?.find(
        (entry) => entry.entryPointType === "video"
      )?.uri ||
      null
    );
  }

  // Get Meeting Phone Numbers
  getMeetingPhoneNumbers(event: calendar_v3.Schema$Event): Array<{
    uri: string;
    label?: string;
    pin?: string;
  }> {
    const phoneEntries =
      event.conferenceData?.entryPoints?.filter(
        (entry) => entry.entryPointType === "phone"
      ) || [];

    return phoneEntries.map((entry) => ({
      uri: entry.uri || "",
      ...(entry.label && { label: entry.label }),
      ...(entry.pin && { pin: entry.pin }),
    }));
  }

  // Move Meeting to Different Calendar
  async moveMeeting(
    eventId: string,
    sourceCalendarId: string,
    destinationCalendarId: string,
    sendNotifications: boolean = true
  ) {
    const response = await this.calendar.events.move({
      calendarId: sourceCalendarId,
      eventId,
      destination: destinationCalendarId,
      sendUpdates: sendNotifications ? "all" : "none",
    });

    return response.data;
  }

  // Quick Create Meeting (simplified version)
  async quickCreateMeeting(
    text: string,
    options?: {
      calendarId?: string;
      sendNotifications?: boolean;
    }
  ) {
    const { calendarId = "primary", sendNotifications = true } = options || {};

    const response = await this.calendar.events.quickAdd({
      calendarId,
      text,
      sendUpdates: sendNotifications ? "all" : "none",
    });

    return response.data;
  }

  // List Calendars
  async listCalendars(options?: {
    maxResults?: number;
    pageToken?: string;
    showHidden?: boolean;
    showDeleted?: boolean;
  }) {
    const response = await this.calendar.calendarList.list({
      maxResults: options?.maxResults || 100,
      pageToken: options?.pageToken,
      showHidden: options?.showHidden,
      showDeleted: options?.showDeleted,
    });

    return response.data;
  }

  // Get Calendar
  async getCalendar(calendarId: string = "primary") {
    const response = await this.calendar.calendars.get({
      calendarId,
    });

    return response.data;
  }
}
