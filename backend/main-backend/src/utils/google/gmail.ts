import { google } from "googleapis";
import { ENV } from "../../config";

import { gmail_v1 } from "googleapis";
export class GmailService {
  private oauth2Client;
  private gmail: gmail_v1.Gmail;
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
      throw new Error("no required Creadetials are provided");
    }
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
    this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
  }

  //utils
  private getEmailBody(message: gmail_v1.Schema$Message): string {
    if (!message.payload) return "";

    const parts = message.payload.parts || [message.payload];

    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    }

    for (const part of parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    }

    if (message.payload.body?.data) {
      return Buffer.from(message.payload.body.data, "base64").toString("utf-8");
    }

    return "";
  }

  //read
  async listMessages(options?: {
    maxResults?: number;
    pageToken?: string;
    q?: string; // Gmail search query
    labelIds?: string[];
    includeSpamTrash?: boolean;
  }) {
    const response = await this.gmail.users.messages.list({
      userId: "me",
      maxResults: options?.maxResults || 100,
      pageToken: options?.pageToken,
      q: options?.q,
      labelIds: options?.labelIds,
      includeSpamTrash: options?.includeSpamTrash || false,
    });

    return response.data;
  }
  async getMessage(
    messageId: string,
    format: "full" | "metadata" | "minimal" | "raw" = "full"
  ) {
    const response = await this.gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format,
    });

    return response.data;
  }

  //write

  async sendEmail(options: {
    to: string | string[];
    subject: string;
    body: string;
    cc?: string | string[];
    bcc?: string | string[];
    isHtml?: boolean;
    attachments?: Array<{
      filename: string;
      content: string;
      mimeType: string;
    }>;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }) {
    const { to, subject, body, cc, bcc, isHtml, attachments, threadId } =
      options;

    let message = "";

    message += `To: ${Array.isArray(to) ? to.join(", ") : to}\r\n`;
    if (cc) {
      message += `Cc: ${Array.isArray(cc) ? cc.join(", ") : cc}\r\n`;
    }
    if (bcc) {
      message += `Bcc: ${Array.isArray(bcc) ? bcc.join(", ") : bcc}\r\n`;
    }
    message += `Subject: ${subject}\r\n`;

    if (options.inReplyTo) {
      message += `In-Reply-To: ${options.inReplyTo}\r\n`;
    }
    if (options.references) {
      message += `References: ${options.references}\r\n`;
    }

    if (attachments && attachments.length > 0) {
      const boundary = "boundary_" + Date.now();
      message += `Content-Type: multipart/mixed; boundary=${boundary}\r\n\r\n`;

      message += `--${boundary}\r\n`;
      message += `Content-Type: ${
        isHtml ? "text/html" : "text/plain"
      }; charset=UTF-8\r\n\r\n`;
      message += `${body}\r\n\r\n`;

      for (const attachment of attachments) {
        message += `--${boundary}\r\n`;
        message += `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"\r\n`;
        message += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
        message += `Content-Transfer-Encoding: base64\r\n\r\n`;
        message += `${attachment.content}\r\n\r\n`;
      }

      message += `--${boundary}--`;
    } else {
      message += `Content-Type: ${
        isHtml ? "text/html" : "text/plain"
      }; charset=UTF-8\r\n\r\n`;
      message += body;
    }

    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await this.gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
        threadId,
      },
    });

    return response.data;
  }
  async forwardEmail(options: {
    messageId: string;
    to: string | string[];
    body?: string;
    cc?: string | string[];
    bcc?: string | string[];
  }) {
    const originalMessage = await this.getMessage(options.messageId, "full");

    const headers = originalMessage.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

    const subject = getHeader("subject");
    const from = getHeader("from");
    const date = getHeader("date");

    const forwardBody = `
${options.body || ""}

---------- Forwarded message ---------
From: ${from}
Date: ${date}
Subject: ${subject}

${this.getEmailBody(originalMessage)}
    `;

    return this.sendEmail({
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: subject?.startsWith("Fwd:") ? subject : `Fwd: ${subject}`,
      body: forwardBody,
    });
  }

  async replyToEmail(options: {
    messageId: string;
    body: string;
    isHtml?: boolean;
    attachments?: Array<{
      filename: string;
      content: string;
      mimeType: string;
    }>;
  }) {
    const originalMessage = await this.getMessage(options.messageId, "full");

    const headers = originalMessage.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

    const to = getHeader("from");
    const subject = getHeader("subject");
    const messageId = getHeader("message-id");
    const references = getHeader("references");

    return this.sendEmail({
      to: to || "",
      subject: subject?.startsWith("Re:") ? subject : `Re: ${subject}`,
      body: options.body,
      isHtml: options.isHtml,
      attachments: options.attachments,
      threadId: originalMessage.threadId!,
      inReplyTo: messageId!,
      references: references ? `${references} ${messageId}` : messageId!,
    });
  }

  //delete

  async untrashMessage(messageId: string) {
    const response = await this.gmail.users.messages.untrash({
      userId: "me",
      id: messageId,
    });

    return response.data;
  }
  async trashMessage(messageId: string) {
    const response = await this.gmail.users.messages.trash({
      userId: "me",
      id: messageId,
    });

    return response.data;
  }
  async deleteMessage(messageId: string) {
    await this.gmail.users.messages.delete({
      userId: "me",
      id: messageId,
    });

    return { success: true };
  }
  async batchDeleteMessages(messageIds: string[]) {
    await this.gmail.users.messages.batchDelete({
      userId: "me",
      requestBody: {
        ids: messageIds,
      },
    });

    return { success: true };
  }
  async modifyMessageLabels(
    messageId: string,
    addLabelIds?: string[],
    removeLabelIds?: string[]
  ) {
    const response = await this.gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        addLabelIds,
        removeLabelIds,
      },
    });

    return response.data;
  }

  async markAsSpam(messageId: string) {
    return this.modifyMessageLabels(messageId, ["SPAM"], ["INBOX"]);
  }
  async archiveMessage(messageId: string) {
    return this.modifyMessageLabels(messageId, undefined, ["INBOX"]);
  }
}
