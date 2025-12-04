import mongoose, { Schema, Document, Types, Model } from "mongoose";

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
  LINK = "link",
  FILE = "file",
  IMAGE = "image",
  CODE = "code",
  TABLE = "table",
  CHART = "chart",
  FORM = "form",
  TASK = "task",
  OTHER = "other",
}
interface IDynamicContent {
  type: DynamicContentType;
  title?: string;
  url?: string;
  metadata?: {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    mimeType?: string;
    thumbnailUrl?: string;
    embedUrl?: string;
    description?: string;
    [key: string]: any;
  };
  data?: any;
}

interface IMessage {
  messageId: string;
  sender: SenderType;
  agentName?: string;
  content: string;
  isDynamic: boolean;
  dynamicContent?: IDynamicContent[];
  encrypted?: boolean; // New field
  iv?: string; // New field for encryption
  tag?: string; // New field for encryption
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    responseTime?: number;
    isEdited?: boolean;
    editedAt?: Date;
    encrypted?: boolean; // New field
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

interface IChatSessionMethods {
  addMessage(
    sender: SenderType,
    content: string,
    options?: {
      agentName?: string;
      isDynamic?: boolean;
      dynamicContent?: IDynamicContent[];
      encrypted?: boolean; // New field
      iv?: string; // New field
      tag?: string; // New field
      metadata?: any;
    }
  ): Promise<IChatSession & IChatSessionMethods>;
}

// Interface for the Model with static methods
interface IChatSessionModel
  extends Model<IChatSession, {}, IChatSessionMethods> {
  createSession(
    userId: Types.ObjectId,
    initialMessage?: {
      sender: SenderType;
      content: string;
      agentName?: string;
    }
  ): Promise<IChatSession & IChatSessionMethods>;
}

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
      totalMessages: {
        type: Number,
        default: 0,
      },
      totalTokens: {
        type: Number,
        default: 0,
      },
      tags: [String],
      isPinned: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
    collection: "chat_sessions",
  }
);

ChatSessionSchema.pre("save", function (next) {
  this.metadata = this.metadata || { totalMessages: 0 };
  this.metadata.totalMessages = this.conversation.length;

  if (this.conversation.length > 0) {
    this.lastMessageAt =
      this.conversation[this.conversation.length - 1].timestamp;
  }

  next();
});

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
    ...(options?.encrypted && { encrypted: options.encrypted }),
    ...(options?.iv && { iv: options.iv }),
    ...(options?.tag && { tag: options.tag }),
    ...(options?.metadata && { metadata: options.metadata }),
  };

  this.conversation.push(message);
  return await this.save();
};

// Static method - IMPORTANT: return type includes methods
ChatSessionSchema.statics.createSession = async function (
  userId: Types.ObjectId,
  initialMessage?: {
    sender: SenderType;
    content: string;
    agentName?: string;
  }
): Promise<IChatSession & IChatSessionMethods> {
  const session = new this({
    userId,
    sessionId: new Types.ObjectId().toString(),
    conversation: initialMessage
      ? [
          {
            messageId: new Types.ObjectId().toString(),
            sender: initialMessage.sender,
            content: initialMessage.content,
            isDynamic: false,
            timestamp: new Date(),
            ...(initialMessage.agentName && {
              agentName: initialMessage.agentName,
            }),
          },
        ]
      : [],
  });

  return await session.save();
};


export const ChatSession = mongoose.model<IChatSession, IChatSessionModel>(
  "ChatSession",
  ChatSessionSchema
);


export {
  SenderType,
  DynamicContentType,
  IMessage,
  IDynamicContent,
  IConversation,
  IChatSessionMethods,
};