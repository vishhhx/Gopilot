import {
  Agent,
  run,
  tool,
  handoff,
  RunContext,
  user,
  RunState,
} from "@openai/agents";
import { GmailService } from "./utils/google/gmail";
import { z } from "zod";
import { config } from "dotenv";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import { gmailCoordinatorAgent } from "./agents/gmail";
import { ServiceConnection } from "./models/connect/serviceConnection";
import { connectDb } from "./config";
config({ path: "../.env" });

const GMAIL_TOKEN =
  "1//0ganiHEhUM-iRCgYIARAAGBASNwF-L9Ir44zZQyOAgvI6NTYFflb7DCGva2cxDMuuKIMSRHsQ6P5tDilmkaiy6q9fz9B2P4A--Jo";
if (!GMAIL_TOKEN) {
  console.warn(
    "Warning: GMAIL_OAUTH_TOKEN is not set. Replace with a valid token in .env for real Gmail calls."
  );
}

function makeGmailService() {
  return new GmailService(GMAIL_TOKEN || "");
}

// const listEmailsTool = tool({
//   name: "list_emails",
//   description: `
// Get a list of emails from Gmail.
// Parameters:
// - maxResults: Number of emails to return (1-500, default: 10). Always provide this, use 10 if not specified.
// - pageToken: Token for pagination. Use empty string "" if no pagination needed.
// - query: Gmail search query. Use empty string "" if no specific query.
// - labelIds: Array of label IDs to filter by. Use empty array [] if no labels specified.
// - includeSpamTrash: Whether to include spam and trash folders. Use true when querying SPAM or TRASH labels, false otherwise.
//   `,
//   parameters: z.object({
//     maxResults: z
//       .number()
//       .int()
//       .min(1)
//       .max(500)
//       .describe("Number of emails to return"),
//     pageToken: z.string().describe("Pagination token or empty string"),
//     query: z.string().describe("Gmail search query or empty string"),
//     labelIds: z.array(z.string()).describe("Array of label IDs or empty array"),
//     includeSpamTrash: z.boolean().describe("Include spam and trash folders"),
//   }),
//   execute: async ({
//     includeSpamTrash,
//     labelIds,
//     maxResults,
//     pageToken,
//     query,
//   }) => {
//     try {
//       const gmail = makeGmailService();

//       const normalizedLabelIds =
//         labelIds?.length > 0
//           ? labelIds.map((label) => label.toUpperCase())
//           : undefined;

//       const result = await gmail.listMessages({
//         maxResults: maxResults || 10,
//         pageToken: pageToken || undefined,
//         q: query || undefined,
//         labelIds: normalizedLabelIds,
//         includeSpamTrash: includeSpamTrash,
//       });

//       if (!result.messages || result.messages.length === 0) {
//         return {
//           success: true,
//           message: "No emails found matching the criteria",
//           data: {
//             messages: [],
//             resultSizeEstimate: 0,
//             nextPageToken: null,
//           },
//         };
//       }

//       const detailedMessages = await Promise.all(
//         result.messages.map(async (msg) => {
//           try {
//             const fullMsg = await gmail.getMessage(msg.id!, "metadata");
//             const headers = fullMsg.payload?.headers || [];

//             const getHeader = (name: string) =>
//               headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
//                 ?.value || "N/A";

//             return {
//               id: fullMsg.id,
//               threadId: fullMsg.threadId,
//               labelIds: fullMsg.labelIds,
//               snippet: fullMsg.snippet,
//               from: getHeader("from"),
//               to: getHeader("to"),
//               subject: getHeader("subject"),
//               date: getHeader("date"),
//               internalDate: fullMsg.internalDate,
//               sizeEstimate: fullMsg.sizeEstimate,
//             };
//           } catch (msgError: any) {
//             console.error(
//               `Failed to fetch message ${msg.id}:`,
//               msgError?.message
//             );
//             return {
//               id: msg.id,
//               error: `Failed to fetch details: ${msgError?.message}`,
//             };
//           }
//         })
//       );

//       return {
//         success: true,
//         data: {
//           messages: detailedMessages,
//           resultSizeEstimate: result.resultSizeEstimate,
//           nextPageToken: result.nextPageToken,
//         },
//       };
//     } catch (error: any) {
//       console.error("Error listing emails:", error);
//       return {
//         success: false,
//         error: error?.message || "Failed to list emails",
//         details: error?.stack,
//       };
//     }
//   },
// });

// const listEmailIdsTool = tool({
//   name: "list_email_ids",
//   description: `
// Get only the Gmail email IDs using filters.

// Parameters (ALL required, even if empty — use defaults):
// - maxResults: Number of emails to return (1-500, default: 10)
// - pageToken: Token for pagination, default: ""
// - query: Gmail search query, default: ""
// - labelIds: Array of Gmail label IDs, default: []
// - includeSpamTrash: Include spam + trash (true/false)
//   `,
//   parameters: z.object({
//     maxResults: z
//       .number()
//       .int()
//       .min(1)
//       .max(500)
//       .describe("Number of email IDs to return"),
//     pageToken: z.string().describe("Pagination token or empty string"),
//     query: z.string().describe("Gmail search query or empty string"),
//     labelIds: z.array(z.string()).describe("Array of label IDs or empty array"),
//     includeSpamTrash: z.boolean().describe("Include spam and trash folders"),
//   }),
//   execute: async ({
//     maxResults,
//     pageToken,
//     query,
//     labelIds,
//     includeSpamTrash,
//   }) => {
//     try {
//       const gmail = makeGmailService();

//       const normalizedLabelIds =
//         labelIds?.length > 0 ? labelIds.map((l) => l.toUpperCase()) : undefined;

//       const result = await gmail.listMessages({
//         maxResults: maxResults || 10,
//         pageToken: pageToken || undefined,
//         q: query || undefined,
//         labelIds: normalizedLabelIds,
//         includeSpamTrash: includeSpamTrash,
//       });

//       const ids = result?.messages?.map((m) => m.id) || [];

//       return {
//         success: true,
//         data: {
//           ids,
//           resultSizeEstimate: result?.resultSizeEstimate || 0,
//           nextPageToken: result?.nextPageToken || null,
//         },
//       };
//     } catch (err: any) {
//       console.error("Error listing email IDs:", err);
//       return {
//         success: false,
//         error: err?.message || "Failed to fetch email IDs",
//         details: err?.stack,
//       };
//     }
//   },
// });

// const readEmailTool = tool({
//   name: "read_email",
//   description:
//     "Get the full content of a specific email by ID. All parameters are required.",
//   parameters: z.object({
//     emailId: z.string().describe("The ID of the email to read"),
//     format: z
//       .enum(["full", "minimal", "raw"])
//       .describe(
//         "Format: 'full' for complete email, 'minimal' for basic info, 'raw' for RFC 2822 format"
//       ),
//   }),
//   execute: async ({ emailId, format }) => {
//     try {
//       const gmail = makeGmailService();
//       const message = await gmail.getMessage(emailId, format);

//       return { success: true, data: message };
//     } catch (error: any) {
//       console.error("Error reading email:", error);
//       return {
//         success: false,
//         error: error?.message || "Failed to read email",
//       };
//     }
//   },
// });

// const trashEmailTool = tool({
//   name: "trash_email",
//   description: "Move an email to trash. Can be restored later.",
//   parameters: z.object({
//     messageId: z.string().min(1),
//   }),
//   execute: async ({ messageId }) => {
//     try {
//       const gmail = makeGmailService();
//       await gmail.trashMessage(messageId);
//       return { success: true, message: "Email moved to trash" };
//     } catch (error: any) {
//       console.error("Error trashing email:", error);
//       return {
//         success: false,
//         error: error?.message || "Failed to trash email",
//       };
//     }
//   },
// });

export const sendEmailTool = tool({
  name: "send_email",
  needsApproval: true,
  description:
    "Send a new email. Required: to (string or array of email addresses), subject (string), body (string). Optional: cc (email string or array), bcc (email string or array), isHtml (boolean, default false), attachments (array of objects with filename, content (base64), and mimeType).",
  parameters: z.object({
    to: z.union([z.string().email(), z.array(z.string().email())]),
    subject: z.string().min(1),
    body: z.string().min(1),
  }),
  execute: async (args: any, context: any) => {
    try {
      const gmail = makeGmailService();
      const emailData = {
        to: args.to,
        subject: args.subject,
        body: args.body,
        cc: args.cc,
        bcc: args.bcc,
        isHtml: args.isHtml ?? false,
        attachments: args.attachments,
      };
      const result = await gmail.sendEmail(emailData);

      return {
        success: true,
        message: `Email sent successfully to ${
          Array.isArray(args.to) ? args.to.join(", ") : args.to
        }`,
        data: {
          id: result.id,
          threadId: result.threadId,
          labelIds: result.labelIds,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }
  },
});
export const forwardEmailTool = tool({
  name: "forward_email",
  description:
    "Forward an existing email to other recipients. Required: messageId (string), to (email string or array). Optional: body (additional message string), cc (email string or array), bcc (email string or array).",
  parameters: z.object({
    messageId: z.string().min(1),
    to: z.union([z.string().email(), z.array(z.string().email())]),
  }),
  execute: async (args: any, context: any) => {
    try {
      const gmail = makeGmailService();
      const forwardData = {
        messageId: args.messageId,
        to: args.to,
        body: args.body,
        cc: args.cc,
        bcc: args.bcc,
      };
      const result = await gmail.forwardEmail(forwardData);

      return {
        success: true,
        message: `Email forwarded successfully to ${
          Array.isArray(args.to) ? args.to.join(", ") : args.to
        }`,
        data: {
          id: result.id,
          threadId: result.threadId,
          labelIds: result.labelIds,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to forward email",
      };
    }
  },
});

export const replyToEmailTool = tool({
  name: "reply_to_email",
  description:
    "Reply to an existing email. Automatically handles threading and includes original message references. Required: messageId (string), body (string). Optional: isHtml (boolean, default false), attachments (array with filename, content base64, mimeType).",
  parameters: z.object({
    messageId: z.string().min(1),
    body: z.string().min(1),
  }),
  execute: async (args: any, context: any) => {
    try {
      const gmail = makeGmailService();
      const replyData = {
        messageId: args.messageId,
        body: args.body,
        isHtml: args.isHtml ?? false,
        attachments: args.attachments,
      };
      const result = await gmail.replyToEmail(replyData);

      return {
        success: true,
        message: "Reply sent successfully",
        data: {
          id: result.id,
          threadId: result.threadId,
          labelIds: result.labelIds,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to send reply",
      };
    }
  },
});

// const gmailDeleterAgent = new Agent({
//   name: "gmail-deleter-agent",
//   instructions: `
//     You are a Gmail deletion assistant.
//     1. Analyze the conversation history for email IDs provided by the 'gmail-reader-agent'.
//     2. Execute 'trash_email' for the specified IDs.
//     3. Confirm the action to the user.

//     HANDOFF LOGIC:
//     - If the user asks to "verify" the deletion by searching again, or asks to find NEW emails after the deletion,
//       you must HANDOFF back to the 'gmail-reader-agent'.
//   `,
//   tools: [trashEmailTool],
//   handoffs: [],
// });

// const gmailReaderAgent = new Agent({
//   name: "gmail-reader-agent",
//   instructions: `
//     You are a Gmail reader assistant.
//     1. Search/List emails using 'list_emails' or 'list_email_ids'.
//     2. Output details clearly (ID, Subject, Sender).

//     HANDOFF LOGIC:
//     - If the user's request involves deleting, trashing, or cleaning these emails,
//       HANDOFF to the 'gmail-deleter-agent' immediately after fetching the data.
//   `,
//   tools: [listEmailIdsTool, listEmailsTool, readEmailTool],
//   handoffs: [gmailDeleterAgent],
// });

// gmailDeleterAgent.handoffs.push(gmailReaderAgent);

// export const gmailCoordinatorAgent = new Agent({
//   name: "gmail-coordinator-agent",
//   instructions: `
//     You are a Gmail coordination agent.

//     ROUTING LOGIC:
//     1. If the request is to FIND, SEARCH, or READ -> Hand off to 'gmail-reader-agent'.
//        (Even if the ultimate goal is deletion, the Reader must find them first).

//     2. If the request is PURELY DELETION (and provides an explicit ID like "Delete msg_123") -> Hand off to 'gmail-deleter-agent'.

//     3. If the request is mixed ("Find X and delete it"), Hand off to 'gmail-reader-agent' first.
//   `,
//   handoffs: [gmailReaderAgent, gmailDeleterAgent],
// });

const gmailWriterAgent = new Agent({
  name: "gmail-writer-agent",
  instructions: `
You are the Gmail writer agent, responsible for all email composition and sending.

Your tasks are to:
- Use the provided tools to **send new emails**.
- Use the provided tools to **reply** to existing emails.
- Use the provided tools to **forward** existing emails.
 `,
  tools: [sendEmailTool, replyToEmailTool, forwardEmailTool],
});

const RefreshTokenOutput = z.object({
  results: z.array(
    z.object({
      service: z.string(),
      refreshToken: z.string().nullable(),
      found: z.boolean(),
      reason: z.string().nullable(),
    })
  ),
});
interface userDeatils {
  userId: string;
}
export const getRefreshTokenTool = tool({
  name: "get-refresh-token",
  description: "Get the refresh token from DB",
  parameters: z.object({
    service: z.string().describe("The service name (e.g., gmail, drive)"),
  }),

  execute: async ({ service }, runContext?: RunContext<userDeatils>) => {
    console.log("🔹 [get-refresh-token] Tool invoked");

    try {
      const userId = runContext?.context?.userId;
      console.log("🔹 Input:", { userId, service });

      if (!userId) {
        console.log("❌ No userId found in runContext");
        return {
          success: false,
          data: null,
          error: "User ID not found in context",
        };
      }

      console.log("🔹 Querying DB...");

      const connections = await ServiceConnection.find({ userId })
        .populate({
          path: "connectionDefId",
          match: { service },
          select: "service",
        })
        .select("connectionDefId userId status refreshToken");

      console.log("🔹 Raw DB Result:", connections);

      const data = connections
        .filter(
          (c) => c.connectionDefId && typeof c.connectionDefId === "object"
        )
        .map((c) => ({
          service: (c.connectionDefId as any).service,
          userId: c.userId,
          status: c.status,
          refreshToken: c.refreshToken,
        }));

      console.log("🔹 Filtered + Mapped Data:", data);

      if (data.length > 0) {
        console.log(" Found refresh token(s)");
        return {
          success: true,
          data,
        };
      } else {
        console.log("No matching refresh tokens found");
        return {
          success: false,
          data: null,
          error: `No refreshToken found for service ${service}`,
        };
      }
    } catch (err: any) {
      console.error(" [get-refresh-token] ERROR:", err);

      return {
        success: false,
        data: null,
        error:
          err?.message ?? "Unknown error occurred in get-refresh-token tool",
      };
    }
  },
});

export const ValidatorAgent = new Agent({
  name: "validator-agent",
  instructions: `
Validate which services the user has connected
and return each service with its refreshToken.
Only use the get-refresh-token tool. 
Return exactly the outputType format.
`,
  outputType: RefreshTokenOutput,

  tools: [getRefreshTokenTool],
});

async function runExamples() {
  try {
    // const prompt =
    //   "Find emails from no-reply@notify.proton.me since 2025-11-10 and trash them.";

    // const result = await run(gmailCoordinatorAgent, prompt);
    const result = await run(
      gmailWriterAgent,
      "send a mail to pastevishwa@gmail.com subject regarding his addtence with less then 20 % with approprate body"
    );
    if (result.interruptions?.length > 0) {
      const state = await RunState.fromString(
        gmailWriterAgent,
        JSON.stringify(result.state)
      );

      for (const interruption of result.interruptions) {
        const confirmed = true;
        if (confirmed) {
          state.approve(interruption);
        } else {
          state.reject(interruption);
        }
      }
    } else {
      console.log(result.finalOutput);
    }
    // interface Token {
    //   refreshToken: string;
    // }
    // const respone = await run(gmailCoordinatorAgent, "trash top 2 mails  ", {
    //   context: {
    //     refreshToken: GMAIL_TOKEN,
    //   },
    // });
    // console.log(respone.finalOutput)
    // await connectDb();
    // const result = await run(ValidatorAgent, "get my top 2 mails", {
    //   context: {
    //     userId: "68f67b23041811cb079e00c8",
    //   },
    // });
    // const context = [
    //   {
    //     service: "gmail",
    //     refreshToken:
    //       "1//0ganiHEhUM-iRCgYIARAAGBASNwF-L9Ir44zZQyOAgvI6NTYFflb7DCGva2cxDMuuKIMSRHsQ6P5tDilmkaiy6q9fz9B2P4A--Jo",
    //   },
    // ];
    // const result = await run(
    //   gmailCoordinatorAgent,
    //   "get me  my last two latest  mails",
    //   {
    //     context,
    //   }
    // );
    // console.log(result.finalOutput);
  } catch (err: any) {
    console.error("Agent run failed:", err?.message || err);
  }
}

if (require.main === module) {
  runExamples().then(() => process.exit(0));
}
