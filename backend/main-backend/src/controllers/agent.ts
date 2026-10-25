import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "../utils";
import {
  createOrchestrator,
  PRIVATE_RUN_CONFIG,
  SERVICE_TOOLS,
} from "../agents/orchestrator";
import {
  Runner,
  assistant,
  system,
  user,
  type AgentInputItem,
  type RunToolCallOutputItem,
} from "@openai/agents";
import {
  ChatSession,
  DynamicContentType,
  IDynamicContent,
  IMessage,
  SenderType,
} from "../models/chat/chatSession";
import { Types } from "mongoose";
import { getServiceTokens } from "../services/serviceTokens";
import { validTimeZone } from "../utils/time";
import { decryptText, encryptText } from "../utils/crypto";
import {
  HistoryTurn,
  loadSessionHistory,
  memoryPrompt,
  recallTurns,
  rememberTurn,
} from "../services/memory";
import { generateChatTitle } from "../services/chatTitle";
import { WorkflowModel } from "../models/workflow/workflow";
import { RunInputError, serializeRun, startRun } from "../workflow/engine";
import { workflowChatTools } from "../workflow/chatTools";

// One runner for every chat: no stored responses or uploaded traces on OpenAI's side.
const runner = new Runner(PRIVATE_RUN_CONFIG);

const HISTORY_TURNS = 12;
const DYNAMIC_TYPES = new Set<string>(Object.values(DynamicContentType));

const readMessage = (m: IMessage) => {
  if (!m.encrypted || !m.iv || !m.tag) return m.content;
  try {
    return decryptText(m.content, m.iv, m.tag);
  } catch {
    return "";
  }
};

/** History from the Mongo copy of the chat, used only when Qdrant is unavailable. */
const historyFromMongo = (conversation: IMessage[]): HistoryTurn[] => {
  const turns: HistoryTurn[] = [];
  let pending: string | null = null;
  for (const m of conversation) {
    if (m.sender === SenderType.USER) pending = readMessage(m);
    else if (m.sender === SenderType.AGENT && pending !== null) {
      turns.push({ userMessage: pending, agentReply: readMessage(m) });
      pending = null;
    }
  }
  return turns.slice(-HISTORY_TURNS);
};

/** Cards (emails, events, files) from a service agent's structured reply. */
const extractDynamicContent = (output: unknown): IDynamicContent[] => {
  let value = output;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  const items = (value as { dynamicContent?: unknown } | null)?.dynamicContent;
  return Array.isArray(items)
    ? items.filter((i) => i && typeof i === "object" && DYNAMIC_TYPES.has(i.type))
    : [];
};

const ID_KEYS = ["eventId", "emailId", "threadId", "fileId", "spreadsheetId", "formId", "calendarId"];
const metadataOf = (d: IDynamicContent) => (d.metadata ?? {}) as Record<string, unknown>;

/** Cards to show: one per item and operation, and only the changes when the turn changed something. */
const selectCards = (items: IDynamicContent[]) => {
  const key = (d: IDynamicContent) => {
    const m = metadataOf(d);
    return `${d.type}:${ID_KEYS.map((k) => m[k]).find(Boolean) ?? d.title}:${m.operation ?? ""}`;
  };
  const unique = [...new Map(items.map((d) => [key(d), d])).values()];
  const changed = unique.filter((d) => {
    const op = metadataOf(d).operation;
    return op && op !== "read";
  });
  return changed.length ? changed : unique;
};

/** One line per item with its ids, saved with the reply so later turns can act on it. */
const describeItems = (items: IDynamicContent[]) =>
  items
    .map((d) => {
      const m = metadataOf(d);
      const when = m.start ?? m.startTime ?? m.date;
      const ids = ID_KEYS.filter((k) => m[k]).map((k) => `${k}=${m[k]}`);
      return `- ${d.type} ${m.operation ?? ""} "${d.title ?? ""}"${when ? ` at ${when}` : ""} ${ids.join(" ")}${d.url ? ` url=${d.url}` : ""}`;
    })
    .join("\n");

/*
  POST /agent/chat/:sessionId, streamed as Server-Sent Events:
    step  { id, tool, service, status: "running" | "done" }  a service agent started or finished
    delta { text }                                           the next piece of the answer
    done  { result, sessionId }                              the final reply, same shape as before
    error { message }
*/
export const HandleNormalChat = asyncHandler(
  async (req: Request, res: Response) => {
    const { message, timeZone } = req.body;
    const { sessionId } = req.params;
    const { userId } = req.user;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json(new ApiResponse(400, null, "Message is required"));
    }

    const [context, chatSession] = await Promise.all([
      getServiceTokens(userId),
      ChatSession.findOne({ sessionId, userId }),
    ]);
    if (!chatSession) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Chat session not found"));
    }
    console.log(
      "[HandleNormalChat] connected services:",
      context.map((c) => c.service)
    );

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    // If the tab closes, writes stop but the run finishes and is saved, so a half-done task
    // (calendar read, email not yet sent) isn't abandoned.
    const send = (event: string, data: unknown) => {
      if (!res.writableEnded && !res.destroyed) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };
    const heartbeat = setInterval(() => {
      if (!res.writableEnded && !res.destroyed) res.write(": ping\n\n");
    }, 15000);

    try {
      const sealedMessage = encryptText(message);
      await chatSession.addMessage(SenderType.USER, sealedMessage.encrypted, {
        encrypted: true,
        iv: sealedMessage.iv,
        tag: sealedMessage.tag,
        metadata: { encrypted: true },
      });
      const userMessageId = chatSession.conversation.at(-1)!.messageId;

      // The chat's own history and memory from other chats both come from Qdrant.
      const [stored, recalled] = await Promise.all([
        loadSessionHistory({ userId, sessionId, limit: HISTORY_TURNS }),
        recallTurns({ userId, sessionId, query: message }),
      ]);
      const history = stored ?? historyFromMongo(chatSession.conversation.slice(0, -1));
      const memory = memoryPrompt(recalled);
      console.log(
        `[HandleNormalChat] history: ${history.length} turns, recalled ${recalled.length} memories`
      );

      const input: AgentInputItem[] = [
        ...(memory ? [system(memory)] : []),
        ...history.flatMap((t) => [user(t.userMessage), assistant(t.agentReply)]),
        user(message),
      ];

      const zone = validTimeZone(timeZone);
      const stream = await runner.run(createOrchestrator(zone, workflowChatTools(userId, zone)), input, {
        context,
        stream: true,
        maxTurns: 20,
      });

      const dynamicContent: IDynamicContent[] = [];
      for await (const event of stream) {
        if (event.type === "raw_model_stream_event") {
          if (event.data.type === "output_text_delta") send("delta", { text: event.data.delta });
        } else if (event.type === "run_item_stream_event") {
          if (event.name === "tool_called") {
            const raw = event.item.rawItem as { name?: string; callId?: string };
            const tool = raw.name ?? "";
            send("step", {
              id: raw.callId,
              tool,
              service: SERVICE_TOOLS[tool as keyof typeof SERVICE_TOOLS] ?? null,
              status: "running",
            });
          } else if (event.name === "tool_output") {
            const item = event.item as RunToolCallOutputItem;
            const raw = item.rawItem as { callId?: string };
            send("step", { id: raw.callId, status: "done" });
            dynamicContent.push(...extractDynamicContent(item.output));
          }
        }
      }
      await stream.completed;

      const answer =
        typeof stream.finalOutput === "string"
          ? stream.finalOutput
          : JSON.stringify(stream.finalOutput ?? "");
      const cards = selectCards(dynamicContent);
      const isDynamic = cards.length > 0;
      const result = { isDynamic, content: answer, dynamicContent: cards };

      const sealedReply = encryptText(isDynamic ? JSON.stringify(answer) : answer);
      await chatSession.addMessage(SenderType.AGENT, sealedReply.encrypted, {
        agentName: "orchestrator",
        isDynamic,
        ...(isDynamic && { dynamicContent: cards }),
        encrypted: true,
        iv: sealedReply.iv,
        tag: sealedReply.tag,
        metadata: {
          model: "gpt-4.1",
          responseTime: Date.now(),
          encrypted: true,
        },
      });

      send("done", { result, sessionId: chatSession.sessionId });

      // Every item touched this turn, lookups included, so a later turn can act on it by id.
      const facts = dynamicContent.length ? `\n\nItems:\n${describeItems(dynamicContent)}` : "";
      void rememberTurn({
        userId,
        sessionId,
        messageId: userMessageId,
        userMessage: message,
        agentReply: answer + facts,
        agentName: stream.lastAgent?.name,
      });
    } catch (err: any) {
      console.error("[HandleNormalChat] error:", err);
      send("error", { message: err?.message ?? "The agents couldn't finish this request." });
    } finally {
      clearInterval(heartbeat);
      res.end();
    }
  }
);

export const handleInitChat = asyncHandler(
  async (req: Request, res: Response) => {
    const initialMessage = req.body;
    const { userId } = req.user;
    // The chat page sends the first message itself; here it only names the conversation.
    // A chat started to run a workflow is simply named after the workflow.
    const title =
      typeof initialMessage?.title === "string" && initialMessage.title.trim()
        ? initialMessage.title.trim().slice(0, 80)
        : await generateChatTitle(initialMessage?.message ?? initialMessage?.content ?? "");

    const chatSession = await ChatSession.createSession(
      new Types.ObjectId(userId),
      initialMessage?.content
        ? {
            sender: SenderType.USER,
            content: initialMessage.content,
          }
        : undefined
    );
    chatSession.title = title;
    await chatSession.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          sessionId: chatSession.sessionId,
          _id: chatSession._id,
          title,
          session: chatSession,
        },
        "Your new session created successfully"
      )
    );
  }
);

/*
  POST /agent/chat/:sessionId/workflow { workflowId, inputs, timeZone }
  Starts one of the user's workflows from the chat. The chat gets the request and a "workflow" card
  that points at the run, so the card always shows the run's live state, even after a reload.
*/
export const runWorkflowInChat = asyncHandler(
  async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { userId } = req.user;
    const { workflowId, inputs, timeZone } = req.body ?? {};

    if (!Types.ObjectId.isValid(workflowId)) {
      return res.status(400).json(new ApiResponse(400, null, "Pick a workflow to run"));
    }
    const [chatSession, workflow] = await Promise.all([
      ChatSession.findOne({ sessionId, userId }),
      WorkflowModel.findOne({ _id: workflowId, userId, isDeleted: false }),
    ]);
    if (!chatSession) {
      return res.status(404).json(new ApiResponse(404, null, "Chat session not found"));
    }
    if (!workflow) {
      return res.status(404).json(new ApiResponse(404, null, "Workflow not found"));
    }

    let run;
    try {
      run = await startRun(workflow, userId, inputs, validTimeZone(timeZone));
    } catch (err) {
      if (err instanceof RunInputError) {
        return res.status(400).json(new ApiResponse(400, { issues: err.issues }, err.message));
      }
      throw err;
    }

    const title = workflow.title || "Untitled workflow";
    const request = encryptText(`Run the workflow "${title}"`);
    await chatSession.addMessage(SenderType.USER, request.encrypted, {
      encrypted: true,
      iv: request.iv,
      tag: request.tag,
      metadata: { encrypted: true },
    });

    const card: IDynamicContent = {
      type: DynamicContentType.WORKFLOW,
      title,
      url: `/workflow/${workflow.id}`,
      metadata: { runId: run.id, workflowId: workflow.id, operation: "started" },
    };
    const content = `Running "${title}". You can follow it here.`;
    const reply = encryptText(JSON.stringify(content));
    await chatSession.addMessage(SenderType.AGENT, reply.encrypted, {
      agentName: "workflow",
      isDynamic: true,
      dynamicContent: [card],
      encrypted: true,
      iv: reply.iv,
      tag: reply.tag,
      metadata: { responseTime: Date.now(), encrypted: true },
    });

    return res.status(200).json(
      new ApiResponse(200, {
        result: { isDynamic: true, content, dynamicContent: [card] },
        run: serializeRun(run),
        sessionId: chatSession.sessionId,
      })
    );
  }
);
