import OpenAI from "openai";

const openai = new OpenAI();

const fallbackTitle = (message: string) => {
  const line = message.trim().split("\n")[0];
  return line.length > 60 ? `${line.slice(0, 57)}...` : line || "New task";
};

export const generateChatTitle = async (message: string): Promise<string> => {
  if (!message?.trim()) return "New task";
  try {
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      instructions:
        "Name this chat for a sidebar in 2 to 6 words, based on the user's first message. " +
        "Use sentence case, no quotes, no trailing punctuation. Reply with the name only.",
      input: message.slice(0, 2000),
      max_output_tokens: 20,
      store: false,
    });
    const title = response.output_text.trim().replace(/^["']|["'.]$/g, "");
    return title ? title.slice(0, 80) : fallbackTitle(message);
  } catch (error) {
    console.error("[chatTitle] failed to generate title:", error);
    return fallbackTitle(message);
  }
};
