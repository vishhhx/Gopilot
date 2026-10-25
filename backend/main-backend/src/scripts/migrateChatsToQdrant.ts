// Moves chat history off OpenAI: copies every chat's turns from Mongo into Qdrant, then (with
// --delete-openai) deletes the OpenAI Conversations that used to hold the same history.
// Safe to re-run: chats already in Qdrant are skipped.
// Usage: npm run migrate:chats [-- --delete-openai]
import mongoose from "mongoose";
import OpenAI from "openai";
import { connectDb, ConnectToQdrant, getQdrant } from "../config";
import { MEMORY_COLLECTION } from "../config/qdrant";
import { ChatSession, IMessage, SenderType } from "../models/chat/chatSession";
import { rememberTurn } from "../services/memory";
import { decryptText } from "../utils/crypto";

const deleteRemote = process.argv.includes("--delete-openai");

const readMessage = (m: IMessage) =>
  m.encrypted && m.iv && m.tag ? decryptText(m.content, m.iv, m.tag) : m.content;

// Agent replies were saved JSON-encoded (a string, or a { content } object); keep just the text.
const replyText = (raw: string) => {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed.content === "string") return parsed.content;
  } catch {
    /* plain text */
  }
  return raw;
};

const migrate = async () => {
  await connectDb();
  await ConnectToQdrant();
  const qdrant = getQdrant();
  if (!qdrant) throw new Error("Qdrant is not reachable; start it with docker compose first.");
  const openai = new OpenAI();

  const sessions = await ChatSession.find({});
  let copied = 0;
  let deleted = 0;

  for (const session of sessions) {
    const userId = session.userId.toString();
    const { count } = await qdrant.count(MEMORY_COLLECTION, {
      filter: {
        must: [
          { key: "userId", match: { value: userId } },
          { key: "sessionId", match: { value: session.sessionId } },
        ],
      },
      exact: true,
    });

    let turns = 0;
    if (count === 0) {
      let pending: IMessage | null = null;
      for (const m of session.conversation) {
        if (m.sender === SenderType.USER) pending = m;
        else if (m.sender === SenderType.AGENT && pending) {
          await rememberTurn({
            userId,
            sessionId: session.sessionId,
            messageId: pending.messageId,
            userMessage: readMessage(pending),
            agentReply: replyText(readMessage(m)),
            agentName: m.agentName,
            at: new Date(m.timestamp),
          });
          turns++;
          pending = null;
        }
      }
      copied += turns;
    }
    console.log(`${session.sessionId}: ${count ? `already in qdrant (${count})` : `copied ${turns} turns`}`);

    const conversationId =
      session.metadata?.openAiConversationId ??
      (session.sessionId.startsWith("conv_") ? session.sessionId : null);
    if (deleteRemote && conversationId && !session.metadata?.openAiConversationDeleted) {
      try {
        await openai.conversations.delete(conversationId);
        console.log(`  deleted OpenAI conversation ${conversationId}`);
      } catch (error: any) {
        if (error?.status !== 404) throw error;
        console.log(`  OpenAI conversation ${conversationId} was already gone`);
      }
      session.metadata = { ...session.metadata, totalMessages: session.conversation.length, openAiConversationDeleted: true };
      session.markModified("metadata");
      await session.save();
      deleted++;
    }
  }

  console.log(`\n${sessions.length} chats, ${copied} turns copied to qdrant${deleteRemote ? `, ${deleted} OpenAI conversations deleted` : ""}.`);
  await mongoose.disconnect();
};

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
