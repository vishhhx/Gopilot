import { API_BASE } from "@/utils";
import type { ServiceId } from "@/lib/services";

/** A service agent the orchestrator called, as reported by the `step` events. */
export interface AgentStep {
  id: string;
  service: ServiceId | null;
  tool: string;
  status: "running" | "done";
}

export interface ChatStreamHandlers {
  onStep: (step: Pick<AgentStep, "id" | "status"> & Partial<AgentStep>) => void;
  onDelta: (text: string) => void;
  onDone: (result: unknown) => void;
}

/**
 * Sends a chat message and reads the reply as Server-Sent Events. axios can't read a streamed
 * body in the browser, so this uses fetch with the same cookie credentials.
 */
export async function streamChat(
  sessionId: string,
  message: string,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${API_BASE}agent/chat/${encodeURIComponent(sessionId)}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ message, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    signal,
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `The server answered ${res.status}.`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let finished = false;

  const handle = (block: string) => {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (data.length === 0) return; // comments such as ": ping"
    const payload = JSON.parse(data.join("\n"));
    if (event === "step") handlers.onStep(payload);
    else if (event === "delta") handlers.onDelta(payload.text ?? "");
    else if (event === "done") {
      finished = true;
      handlers.onDone(payload.result);
    } else if (event === "error") throw new Error(payload.message || "The agents couldn't finish this request.");
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let end: number;
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      handle(buffer.slice(0, end));
      buffer = buffer.slice(end + 2);
    }
  }
  if (buffer.trim()) handle(buffer);
  if (!finished) throw new Error("The connection closed before the reply finished. Reload to see if it completed.");
}
