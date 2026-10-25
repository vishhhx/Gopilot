/**
 * Shapes of what the agents send back, and the normalisation that turns stored and live replies
 * into one message type the chat can render.
 */

export interface Person {
  email?: string;
  displayName?: string;
  responseStatus?: string;
}

export interface DynamicContent {
  type: string;
  title?: string;
  url?: string | null;
  metadata?: Record<string, unknown> | null;
  data?: Record<string, unknown> | null;
}

export interface AgentReply {
  isDynamic?: boolean;
  content: string;
  dynamicContent?: DynamicContent[] | null;
}

export type Sender = "user" | "agent" | "system";

export interface ChatMessage {
  messageId: string;
  sender: Sender;
  agentName?: string;
  content: string;
  isDynamic: boolean;
  dynamicContent: DynamicContent[];
  timestamp: string;
  isError?: boolean;
  /** set on replies that arrived in this visit, so only they animate in */
  fresh?: boolean;
  /** for error messages: the prompt to send again */
  retryPrompt?: string;
}

export interface SessionData {
  _id: string;
  sessionId: string;
  title?: string;
  conversation: ChatMessage[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

function tryParse(text: string): unknown {
  const t = text.trim();
  if (!(t.startsWith("{") || t.startsWith('"') || t.startsWith("["))) return undefined;
  try {
    return JSON.parse(t);
  } catch {
    return undefined;
  }
}

/**
 * The backend stores agent replies JSON-encoded: a dynamic reply's content as a JSON string,
 * a plain reply as the whole `{ isDynamic, content }` object. Unwrap either.
 */
function unwrapContent(raw: unknown): { content: string; reply?: Partial<AgentReply> } {
  if (typeof raw !== "string") {
    if (raw && typeof raw === "object" && "content" in raw) {
      const r = raw as AgentReply;
      return { content: String(r.content ?? ""), reply: r };
    }
    return { content: raw == null ? "" : JSON.stringify(raw) };
  }
  const parsed = tryParse(raw);
  if (typeof parsed === "string") return { content: parsed };
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "content" in parsed) {
    const r = parsed as AgentReply;
    return { content: String(r.content ?? ""), reply: r };
  }
  return { content: raw };
}

function asArray(v: unknown): DynamicContent[] {
  return Array.isArray(v) ? (v.filter(Boolean) as DynamicContent[]) : [];
}

export function normalizeMessage(raw: Record<string, unknown>, index = 0): ChatMessage {
  const sender = (raw.sender as Sender) || "agent";
  const { content, reply } =
    sender === "user" ? { content: String(raw.content ?? ""), reply: undefined } : unwrapContent(raw.content);
  const dynamicContent = asArray(raw.dynamicContent).length
    ? asArray(raw.dynamicContent)
    : asArray(reply?.dynamicContent);
  return {
    messageId: String(raw.messageId ?? raw._id ?? `m-${index}`),
    sender,
    agentName: raw.agentName as string | undefined,
    content,
    isDynamic: Boolean(raw.isDynamic ?? reply?.isDynamic) || dynamicContent.length > 0,
    dynamicContent,
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
    isError: Boolean(raw.isError),
  };
}

/** Turns the `result` of POST /agent/chat into a message. */
export function replyToMessage(result: unknown): ChatMessage {
  const { content, reply } = unwrapContent(result);
  const dynamicContent = asArray(reply?.dynamicContent);
  return {
    messageId: `a-${Date.now()}`,
    sender: "agent",
    agentName: "orchestrator",
    content,
    isDynamic: Boolean(reply?.isDynamic) || dynamicContent.length > 0,
    dynamicContent,
    timestamp: new Date().toISOString(),
    fresh: true,
  };
}

export function sessionTitle(conversation: ChatMessage[] | undefined): string | undefined {
  const first = conversation?.find((m) => m.sender === "user" && m.content.trim());
  if (!first) return undefined;
  const line = first.content.trim().split("\n")[0];
  return line.length > 80 ? `${line.slice(0, 77)}…` : line;
}

/** Reads a string or number field from loosely typed metadata. */
export function field(obj: Record<string, unknown> | null | undefined, ...keys: string[]): string | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

/** Attendees arrive as strings (Calendar) or objects (Meet). */
export function people(v: unknown): Person[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((p) => (typeof p === "string" ? { email: p } : (p as Person)))
    .filter((p) => p && (p.email || p.displayName));
}
