

import { google, calendar_v3 } from "googleapis";
import { ENV } from "../../config";

export class CalendarService {
  private oauth2Client: any;
  private calendar: calendar_v3.Calendar | null;

  // constructor(refreshToken: string) {
  //   if (
  //     !ENV.GOOGLE_CLIENT_ID||
  //     !ENV.GOOGLE_CLIENT_SECRET ||
  //     !ENV.GOOGLE_REDIRECT_URI
  //   ) {
  //     throw new Error(
  //       "Google API credentials are missing in environment variables."
  //     );
  //   }

  //   if (!refreshToken || typeof refreshToken !== "string") {
  //     throw new Error("No required credentials (refresh token) provided");
  //   }

  //   this.oauth2Client = new google.auth.OAuth2(
  //     ENV.GOOGLE_CLIENT_ID,
  //     ENV.GOOGLE_CLIENT_SECRET,
  //     ENV.GOOGLE_REDIRECT_URI
  //   );

  //   this.oauth2Client.setCredentials({
  //     refresh_token: refreshToken,
  //   });

  //   this.calendar = google.calendar({
  //     version: "v3",
  //     auth: this.oauth2Client,
  //   });
  // }

  // ───────────────────────────────────────────
  // LIST EVENTS
  // ───────────────────────────────────────────


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

    if (!refreshToken || typeof refreshToken !== "string") {
      throw new Error("No required credentials (refresh token) provided");
    }

    this.oauth2Client = new google.auth.OAuth2(
      ENV.GOOGLE_CLIENT_ID,
      ENV.GOOGLE_CLIENT_SECRET,
      ENV.GOOGLE_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    this.calendar = google.calendar({
      version: "v3",
      auth: this.oauth2Client,
    });
  }



  async listEvents(options?: {
    calendarId?: string;
    maxResults?: number;
    q?: string;
    timeMin?: string;
    timeMax?: string;
    pageToken?: string;
  }) {
    try {
      if (!this.calendar) {
        throw new Error("Calendar not initialized");
      }

      const maxResults = Math.min(options?.maxResults || 10, 50);

      const response = await this.calendar!.events.list({
        calendarId: options?.calendarId || "primary",
        timeMin: options?.timeMin,
        timeMax: options?.timeMax,
        maxResults: maxResults,
        q: options?.q,
        pageToken: options?.pageToken,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = response.data.items || [];

      const trimmedEvents = events.map((event) => ({
        id: event.id,
        summary: event.summary || "No title",
        description: event.description,
        start: event.start,
        end: event.end,
        attendees: event.attendees,
        location: event.location,
        htmlLink: event.htmlLink,
      }));

      return trimmedEvents;
    } catch (error) {
      console.error("Error listing calendar events:", error);
      throw error;
    }
  }

  // ───────────────────────────────────────────
  // GET SINGLE EVENT
  // ───────────────────────────────────────────
  async getEvent(calendarId: string, eventId: string) {
    try {
      if (!this.calendar) {
        throw new Error("Calendar not initialized");
      }

      const response = await this.calendar!.events.get({
        calendarId,
        eventId,
      });

      return response.data;
    } catch (error) {
      console.error("Error getting calendar event:", error);
      throw error;
    }
  }

  // ───────────────────────────────────────────
  // CREATE EVENT
  // ───────────────────────────────────────────
  async createEvent(options: {
    calendarId?: string;
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    attendees?: Array<{ email: string }>;
    reminders?: {
      useDefault?: boolean;
      overrides?: Array<{ method: string; minutes: number }>;
    };
    recurrence?: string[];
    colorId?: string;
  }) {
    try {
      if (!this.calendar) {
        throw new Error("Calendar not initialized");
      }

      const response = await this.calendar!.events.insert({
        calendarId: options.calendarId || "primary",
        requestBody: {
          summary: options.summary,
          description: options.description,
          start: options.start,
          end: options.end,
          attendees: options.attendees,
          reminders: options.reminders,
          recurrence: options.recurrence,
          colorId: options.colorId,
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error creating calendar event:", error);
      throw error;
    }
  }

  // ───────────────────────────────────────────
  // UPDATE EVENT
  // ───────────────────────────────────────────
  async updateEvent(options: {
    calendarId?: string;
    eventId: string;
    summary?: string;
    description?: string;
    start?: { dateTime: string; timeZone?: string };
    end?: { dateTime: string; timeZone?: string };
    attendees?: Array<{ email: string }>;
    reminders?: {
      useDefault?: boolean;
      overrides?: Array<{ method: string; minutes: number }>;
    };
    recurrence?: string[];
    colorId?: string;
  }) {
    try {
      if (!this.calendar) {
        throw new Error("Calendar not initialized");
      }

      const response = await this.calendar!.events.patch({
        calendarId: options.calendarId || "primary",
        eventId: options.eventId,
        requestBody: {
          summary: options.summary,
          description: options.description,
          start: options.start,
          end: options.end,
          attendees: options.attendees,
          reminders: options.reminders,
          recurrence: options.recurrence,
          colorId: options.colorId,
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error updating calendar event:", error);
      throw error;
    }
  }

  // ───────────────────────────────────────────
  // DELETE EVENT
  // ───────────────────────────────────────────
  async deleteEvent(calendarId: string, eventId: string) {
    try {
      if (!this.calendar) {
        throw new Error("Calendar not initialized");
      }

      await this.calendar!.events.delete({
        calendarId,
        eventId,
      });

      return { success: true };
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      throw error;
    }
  }

  // ───────────────────────────────────────────
  // QUICK ADD (Natural Language)
  // ───────────────────────────────────────────
  async quickAdd(options: { calendarId?: string; text: string }) {
    try {
      if (!this.calendar) {
        throw new Error("Calendar not initialized");
      }

      const response = await this.calendar!.events.quickAdd({
        calendarId: options.calendarId || "primary",
        text: options.text,
      });

      return response.data;
    } catch (error) {
      console.error("Error quick adding calendar event:", error);
      throw error;
    }
  }

  // ───────────────────────────────────────────
  // MOVE EVENT
  // ───────────────────────────────────────────
  async moveEvent(options: {
    eventId: string;
    oldCalendarId?: string;
    newCalendarId: string;
  }) {
    try {
      if (!this.calendar) {
        throw new Error("Calendar not initialized");
      }

      const response = await this.calendar!.events.move({
        calendarId: options.oldCalendarId || "primary",
        eventId: options.eventId,
        destination: options.newCalendarId,
      });

      return response.data;
    } catch (error) {
      console.error("Error moving calendar event:", error);
      throw error;
    }
  }

  // ───────────────────────────────────────────
  // CLEANUP - Call this when done
  // ───────────────────────────────────────────
  async cleanup() {
    try {
      if (this.oauth2Client) {
        this.oauth2Client.setCredentials({});
      }
      this.oauth2Client = null;
      this.calendar = null;
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
}