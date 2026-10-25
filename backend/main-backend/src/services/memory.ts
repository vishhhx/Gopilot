import { randomUUID } from "crypto";
import OpenAI from "openai";
import { getQdrant } from "../config";
import { MEMORY_COLLECTION } from "../config/qdrant";
import { decryptText, encryptText } from "../utils/crypto";
const EMBEDDING_MODEL = "text-embedding-3-small";
const MIN_SCORE = 0.4;
const MIN_QUERY_CHARS = 12;
const MAX_EMBED_CHARS = 4000;

const openai = new OpenAI();

export interface ChatTurn {
  userId: string;
  sessionId: string;
  messageId: string;
  userMessage: string;
  agentReply: string;
  agentName?: string;
  at?: Date;
}

export interface HistoryTurn {
  userMessage: string;
  agentReply: string;
}

export interface RecalledTurn {
  sessionId: string;
  userMessage: string;
  agentReply: string;
  createdAt: string;
  score: number;
}

const embed = async (text: string) => {
  const { data } = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, MAX_EMBED_CHARS),
    encoding_format: "float",
  });
  return data[0].embedding;
};

const turnText = (userMessage: string, agentReply: string) =>
  `User: ${userMessage}\nAssistant: ${agentReply}`;


// Every turn is stored: the chat's own history is read back from here (see loadSessionHistory).
export const rememberTurn = async (turn: ChatTurn) => {
  const qdrant = getQdrant();
  if (!qdrant || !turn.userMessage.trim()) return;
  const at = turn.at ?? new Date();

  try {
    const text = turnText(turn.userMessage, turn.agentReply);
    const vector = await embed(text);
    const sealed = encryptText(JSON.stringify({ userMessage: turn.userMessage, agentReply: turn.agentReply }));

    await qdrant.upsert(MEMORY_COLLECTION, {
      points: [
        {
          id: randomUUID(),
          vector,
          payload: {
            userId: turn.userId,
            sessionId: turn.sessionId,
            messageId: turn.messageId,
            agentName: turn.agentName ?? null,
            createdAt: at.toISOString(),
            ts: at.getTime(),
            ...sealed,
          },
        },
      ],
    });
  } catch (error) {
    console.error("[memory] failed to store turn:", error);
  }
};

export const recallTurns = async ({
  userId,
  sessionId,
  query,
  limit = 4,
}: {
  userId: string;
  sessionId: string;
  query: string;
  limit?: number;
}): Promise<RecalledTurn[]> => {
  const qdrant = getQdrant();
  if (!qdrant || query.trim().length < MIN_QUERY_CHARS) return [];

  try {
    const vector = await embed(query);
    const { points } = await qdrant.query(MEMORY_COLLECTION, {
      query: vector,
      filter: {
        must: [{ key: "userId", match: { value: userId } }],
        must_not: [{ key: "sessionId", match: { value: sessionId } }],
      },
      score_threshold: MIN_SCORE,
      limit,
      with_payload: true,
    });

    return points.flatMap((p) => {
      const turn = openPayload(p.payload);
      if (!turn) return [];
      return [
        {
          ...turn,
          sessionId: String(p.payload!.sessionId),
          createdAt: String(p.payload!.createdAt),
          score: p.score,
        },
      ];
    });
  } catch (error) {
    console.error("[memory] recall failed:", error);
    return [];
  }
};


const openPayload = (payload: Record<string, unknown> | null | undefined): HistoryTurn | null => {
  if (!payload?.encrypted) return null;
  try {
    return JSON.parse(
      decryptText(String(payload.encrypted), String(payload.iv), String(payload.tag))
    );
  } catch {
    return null;
  }
};

/**
 * The latest turns of one chat, oldest first. This replaces the OpenAI-side conversation as the
 * chat's history. Returns null when Qdrant is unavailable so the caller can fall back to Mongo.
 */
export const loadSessionHistory = async ({
  userId,
  sessionId,
  limit = 12,
}: {
  userId: string;
  sessionId: string;
  limit?: number;
}): Promise<HistoryTurn[] | null> => {
  const qdrant = getQdrant();
  if (!qdrant) return null;

  try {
    const { points } = await qdrant.scroll(MEMORY_COLLECTION, {
      filter: {
        must: [
          { key: "userId", match: { value: userId } },
          { key: "sessionId", match: { value: sessionId } },
        ],
      },
      order_by: { key: "ts", direction: "desc" },
      limit,
      with_payload: true,
      with_vector: false,
    });
    return points
      .map((p) => openPayload(p.payload))
      .filter((t): t is HistoryTurn => t !== null)
      .reverse();
  } catch (error) {
    console.error("[memory] failed to load chat history:", error);
    return null;
  }
};

export const memoryPrompt = (turns: RecalledTurn[]) => {
  if (turns.length === 0) return null;
  const items = turns
    .map(
      (t, i) =>
        `[${i + 1}] ${t.createdAt.slice(0, 10)}\nUser: ${t.userMessage}\nAssistant: ${t.agentReply.slice(0, 1500)}`
    )
    .join("\n\n");

  return `Relevant memory from this user's earlier chats, most similar first. It may be outdated.
Use it only when it helps with the current request (e.g. names, email addresses, spreadsheet or file ids, preferences, earlier results). Do not mention this memory unless it is relevant, and prefer fresh tool results over remembered data.

${items}`;
};
