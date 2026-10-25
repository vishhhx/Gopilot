import mongoose, { Schema, Document, Types, Model } from "mongoose";

/**
 * Enums
 */
enum SenderType {
  USER = "user",
  AGENT = "agent",
  SYSTEM = "system",
}

enum DynamicContentType {
  GMAIL = "gmail",
  GOOGLE_DRIVE = "google_drive",
  GOOGLE_SHEETS = "google_sheets",
  GOOGLE_DOCS = "google_docs",
  CALENDAR = "calendar",
  GOOGLE_MEET = "google_meet", // added
  LINK = "link",
  FILE = "file",
  IMAGE = "image",
  CODE = "code",
  TABLE = "table",
  CHART = "chart",
  FORM = "form",
  TASK = "task",
  WORKFLOW = "workflow", // a workflow run started from the chat; metadata.runId
  OTHER = "other",
}

/**
 * Typed metadata shapes (optional) — still allow arbitrary keys.
 */
interface GmailMetadata {
  emailId?: string;
  threadId?: string;
  from?: string;
  to?: string[];
  subject?: string;
  date?: string;
  snippet?: string;
  labels?: string[];
  hasAttachments?: boolean;
  operation?: string;
  [key: string]: any;
}

interface CalendarMetadata {
  eventId?: string;
  calendarId?: string;
  summary?: string;
  start?: string; // ISO
  end?: string; // ISO
  organizer?: { email?: string; displayName?: string };
  attendees?: { email?: string; displayName?: string }[];
  location?: string;
  description?: string;
  url?: string | null;
  operation?: string;
  [key: string]: any;
}

interface MeetMetadata {
  eventId?: string;
  summary?: string;
  startTime?: string;
  endTime?: string;
  timeZone?: string;
  meetLink?: string;
  organizer?: { email?: string; displayName?: string };
  attendees?: { email?: string; displayName?: string }[];
  status?: string;
  operation?: string;
  [key: string]: any;
}

/**
 * Generic dynamic content interface (accepts typed metadata OR arbitrary)
 */
interface IDynamicContent {
  type: DynamicContentType;
  title?: string;
  url?: string;
  // Allow Gmail/Calendar/Meet metadata shapes OR any mixed object
  metadata?:
    | GmailMetadata
    | CalendarMetadata
    | MeetMetadata
    | { [key: string]: any };
  data?: any;
}

/**
 * Message & Session interfaces
 */
interface IMessage {
  messageId: string;
  sender: SenderType;
  agentName?: string;
  content: string;
  isDynamic: boolean;
  dynamicContent?: IDynamicContent[];
  encrypted?: boolean;
  iv?: string;
  tag?: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    responseTime?: number;
    isEdited?: boolean;
    editedAt?: Date;
    encrypted?: boolean;
    [key: string]: any;
  };
}

interface IConversation extends IMessage {}

export interface IChatSession extends Document {
  userId: Types.ObjectId;
  sessionId: string;
  title?: string;
  conversation: IConversation[];
  status: "active" | "archived" | "deleted";
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  metadata?: {
    totalMessages: number;
    totalTokens?: number;
    tags?: string[];
    isPinned?: boolean;
    [key: string]: any;
  };
}

/**
 * Instance methods & Model interface
 */
interface IChatSessionMethods {
  addMessage(
    sender: SenderType,
    content: string,
    options?: {
      agentName?: string;
      isDynamic?: boolean;
      dynamicContent?: IDynamicContent[];
      encrypted?: boolean;
      iv?: string;
      tag?: string;
      metadata?: any;
    }
  ): Promise<IChatSession & IChatSessionMethods>;
}

interface IChatSessionModel
  extends Model<IChatSession, {}, IChatSessionMethods> {
  createSession(
    userId: Types.ObjectId,
    initialMessage?: {
      sender: SenderType;
      content: string;
      agentName?: string;
      isDynamic?: boolean;
      dynamicContent?: IDynamicContent[];
    }
  ): Promise<IChatSession & IChatSessionMethods>;
}

/**
 * Mongoose schemas
 */
const MessageSchema = new Schema<IMessage>(
  {
    messageId: {
      type: String,
      required: true,
      default: () => new Types.ObjectId().toString(),
    },
    sender: {
      type: String,
      enum: Object.values(SenderType),
      required: true,
    },
    agentName: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    isDynamic: {
      type: Boolean,
      default: false,
    },
    dynamicContent: [
      {
        type: {
          type: String,
          enum: Object.values(DynamicContentType),
          required: true,
        },
        title: String,
        url: String,
        // keep metadata fully flexible for calendar/meet/gmail etc.
        metadata: {
          type: Schema.Types.Mixed,
          default: {},
        },
        data: Schema.Types.Mixed,
      },
    ],
    encrypted: {
      type: Boolean,
      default: false,
    },
    iv: {
      type: String,
    },
    tag: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const ChatSessionSchema = new Schema<
  IChatSession,
  IChatSessionModel,
  IChatSessionMethods
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      default: () => new Types.ObjectId().toString(),
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    conversation: {
      type: [MessageSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "archived", "deleted"],
      default: "active",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: { totalMessages: 0 },
    },
  },
  {
    timestamps: true,
    collection: "chat_sessions",
  }
);

/**
 * pre-save: keep totalMessages and lastMessageAt in sync,
 * and set title fallback if not provided.
 */
ChatSessionSchema.pre("save", function (next) {
  try {
    // ensure metadata object
    if (!this.metadata || typeof this.metadata !== "object") {
      this.metadata = { totalMessages: 0 };
    }

    // update total messages
    this.metadata.totalMessages = Array.isArray(this.conversation)
      ? this.conversation.length
      : 0;

    // update lastMessageAt from last conversation item (if exists)
    if (Array.isArray(this.conversation) && this.conversation.length > 0) {
      const last = this.conversation[this.conversation.length - 1];
      if (last && last.timestamp) {
        this.lastMessageAt = last.timestamp;
      } else {
        this.lastMessageAt = new Date();
      }
    } else {
      // if no messages, keep lastMessageAt as createdAt or now
      this.lastMessageAt = this.lastMessageAt || new Date();
    }

    // If no title, try derive from first message subject/content.
    // Encrypted messages are skipped: their content is ciphertext, not a readable title.
    if (
      !this.title &&
      Array.isArray(this.conversation) &&
      this.conversation.length > 0 &&
      !this.conversation[0].encrypted
    ) {
      const first = this.conversation[0];
      // for dynamic messages try use first dynamicContent.title or gmail subject
      if (
        first.isDynamic &&
        Array.isArray(first.dynamicContent) &&
        first.dynamicContent.length > 0
      ) {
        const dyn = first.dynamicContent[0];
        this.title =
          dyn.title ||
          (dyn.metadata && dyn.metadata.subject) ||
          (dyn.metadata && dyn.metadata.summary) ||
          first.content.slice(0, 100);
      } else {
        this.title = first.content
          ? String(first.content).slice(0, 120)
          : undefined;
      }
    }
  } catch (e) {
    // swallow — nothing fatal
    console.warn("pre-save chat session normalization error:", e);
  }

  next();
});

/**
 * Instance method: addMessage
 */
ChatSessionSchema.methods.addMessage = async function (
  sender: SenderType,
  content: string,
  options?: {
    agentName?: string;
    isDynamic?: boolean;
    dynamicContent?: IDynamicContent[];
    encrypted?: boolean;
    iv?: string;
    tag?: string;
    metadata?: any;
  }
): Promise<IChatSession & IChatSessionMethods> {
  const message: IMessage = {
    messageId: new Types.ObjectId().toString(),
    sender,
    content,
    isDynamic: options?.isDynamic || false,
    timestamp: new Date(),
    ...(options?.agentName && { agentName: options.agentName }),
    ...(options?.dynamicContent && { dynamicContent: options.dynamicContent }),
    ...(options?.encrypted !== undefined && { encrypted: options.encrypted }),
    ...(options?.iv && { iv: options.iv }),
    ...(options?.tag && { tag: options.tag }),
    ...(options?.metadata && { metadata: options.metadata }),
  };

  if (!Array.isArray(this.conversation)) this.conversation = [];
  this.conversation.push(message);

  // save() will trigger pre-save to recalc totals/lastMessageAt
  return await this.save();
};

/**
 * Static method: createSession
 */
ChatSessionSchema.statics.createSession = async function (
  userId: Types.ObjectId,
  initialMessage?: {
    sender: SenderType;
    content: string;
    agentName?: string;
    isDynamic?: boolean;
    dynamicContent?: IDynamicContent[];
  }
): Promise<IChatSession & IChatSessionMethods> {
  const conv: IMessage[] = [];

  if (initialMessage) {
    conv.push({
      messageId: new Types.ObjectId().toString(),
      sender: initialMessage.sender,
      content: initialMessage.content,
      isDynamic: initialMessage.isDynamic || false,
      timestamp: new Date(),
      ...(initialMessage.agentName && { agentName: initialMessage.agentName }),
      ...(initialMessage.dynamicContent && {
        dynamicContent: initialMessage.dynamicContent,
      }),
    });
  }

  const session = new this({
    userId,
    sessionId: new Types.ObjectId().toString(),
    conversation: conv,
  });

  return await session.save();
};

export const ChatSession = mongoose.model<IChatSession, IChatSessionModel>(
  "ChatSession",
  ChatSessionSchema
);

/**
 * Exports (for external typing)
 */
export {
  SenderType,
  DynamicContentType,
  IMessage,
  IDynamicContent,
  IConversation,
  IChatSessionMethods,
};
