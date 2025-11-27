import { Agent, handoff } from "@openai/agents";
import { z } from "zod";
import { getRefreshTokenTool } from "../tools/util";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import { gmailCoordinatorAgent } from "./gmail";
import { sheetsAgent } from "./sheet";
export const orchestratorAgent = new Agent({
  name: "orchestrator-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Orchestrator. Identify which Google product the user's request belongs to and route it to the correct coordinator.
Routing:
- Gmail → for anything about email (read, send, inbox, messages, Gmail actions)
- Sheets → spreadsheets (cells, rows, columns, create/update sheets)
- Docs → documents (Google Docs). If unsupported, inform the user.
- Drive → files/folders. If unsupported, inform the user.
- Calendar → meetings/events. If unsupported, inform the user.
Multi-service requests:
- Route to the FIRST service that needs to perform an action.
  Examples:
  - "export emails to sheet" → Gmail first
  - "update sheet with emails" → Gmail first
  - Coordinators manage further handoffs themselves.

If unclear:
Ask: “Which service should I use? Gmail, Sheets, or something else?”
Always show a short plan before handing off.
  `,
  tools: [],
  handoffs: [
    handoff(gmailCoordinatorAgent, {
      toolDescriptionOverride:
        "Route to Gmail coordinator for all email-related operations and Gmail↔Sheets workflows.",
    }),
    handoff(sheetsAgent, {
      toolDescriptionOverride:
        "Route to Sheets coordinator for all spreadsheet operations and Sheets↔Gmail workflows.",
    }),
  ],
});

gmailCoordinatorAgent.handoffs?.push(
  handoff(sheetsAgent, {
    toolDescriptionOverride:
      "Gmail → Sheets for tasks like exporting emails or generating reports.",
  })
);

sheetsAgent.handoffs?.push(
  handoff(gmailCoordinatorAgent, {
    toolDescriptionOverride:
      "Sheets → Gmail for emailing sheets, attachments, or sheet-generated content.",
  })
);

export const RefreshTokenOutput = z.object({
  results: z.array(
    z.object({
      service: z.string(),
      refreshToken: z.string().nullable(),
      found: z.boolean(),
      reason: z.string().nullable(),
    })
  ),

  needsConnection: z.boolean(),
  connectActions: z.array(
    z.object({
      service: z.string(),
      reason: z.string().nullable(),
      connectUrl: z.string().nullable(),
    })
  ),
  userMessage: z.string(),
});
