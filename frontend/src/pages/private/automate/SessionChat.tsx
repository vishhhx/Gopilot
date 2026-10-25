import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowDown } from "lucide-react";
import { axiosInstance } from "@/utils";
import ChatInput from "@/components/chat/ChatInput";
import ErrorState from "@/components/Other/common/ErrorState";
import { AgentMessage, ErrorMessage, UserMessage } from "@/components/chat/Messages";
import { LiveReply } from "@/components/chat/LiveReply";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch } from "@/store/hooks";
import { setSessionTitle } from "@/store/slices/sessionSlice";
import {
  normalizeMessage,
  replyToMessage,
  sessionTitle,
  type ChatMessage,
  type SessionData,
} from "@/lib/chat";
import { errorMessage, formatDate } from "@/lib/format";
import { streamChat, type AgentStep } from "@/lib/stream";
import { workflowApi, type WorkflowSummary } from "@/lib/workflow";
import { WorkflowPicker } from "@/components/chat/WorkflowPicker";

function SessionChat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [liveSteps, setLiveSteps] = useState<AgentStep[]>([]);
  const [liveText, setLiveText] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef<string | null>(null);
  const initialPrompt = (location.state as { initialPrompt?: string } | null)?.initialPrompt;

  const getSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await axiosInstance.get(`/session/${sessionId}`);
      const raw = data.data;
      const conversation = ((raw?.conversation ?? []) as Record<string, unknown>[]).map(normalizeMessage);
      setSession({ ...raw, conversation });
      const title = raw?.title || sessionTitle(conversation);
      if (title) dispatch(setSessionTitle({ sessionId, title }));
    } catch (err) {
      setError(errorMessage(err, "Failed to load this task"));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, dispatch]);

  useEffect(() => {
    getSession();
  }, [getSession]);

  const append = (msg: ChatMessage) =>
    setSession((prev) => (prev ? { ...prev, conversation: [...prev.conversation, msg] } : prev));

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!sessionId) return;
      append({
        messageId: `u-${Date.now()}`,
        sender: "user",
        content: message,
        isDynamic: false,
        dynamicContent: [],
        timestamp: new Date().toISOString(),
      });
      setLiveSteps([]);
      setLiveText("");
      let streamed = "";
      try {
        setIsSending(true);
        await streamChat(sessionId, message, {
          onStep: (step) => {
            // text written before a tool call is the model thinking aloud, not the answer
            streamed = "";
            setLiveText("");
            setLiveSteps((prev) =>
              prev.some((s) => s.id === step.id)
                ? prev.map((s) => (s.id === step.id ? { ...s, status: step.status } : s))
                : [...prev, { tool: "", service: null, ...step }]
            );
          },
          onDelta: (text) => {
            streamed += text;
            setLiveText(streamed);
          },
          onDone: (result) => {
            // the text was already read as it streamed, so only replay the reveal if nothing streamed
            append({ ...replyToMessage(result), fresh: !streamed });
          },
        });
      } catch (err) {
        append({
          messageId: `e-${Date.now()}`,
          sender: "system",
          content: errorMessage(err, "The agents couldn't finish this request."),
          isDynamic: false,
          dynamicContent: [],
          timestamp: new Date().toISOString(),
          isError: true,
          retryPrompt: message,
        });
      } finally {
        setIsSending(false);
        setLiveSteps([]);
        setLiveText("");
      }
    },
    [sessionId]
  );

  const runWorkflow = async (wf: WorkflowSummary, values: Record<string, string>) => {
    if (!sessionId) return;
    const { result } = await workflowApi.runInChat(sessionId, wf._id, values);
    append({
      messageId: `u-${Date.now()}`,
      sender: "user",
      content: `Run the workflow "${wf.title || "Untitled workflow"}"`,
      isDynamic: false,
      dynamicContent: [],
      timestamp: new Date().toISOString(),
    });
    append(replyToMessage(result));
  };

  // A task started from "New task" arrives with its first prompt; send it once, then drop it from history.
  useEffect(() => {
    if (!session || !initialPrompt || !sessionId || sentInitial.current === sessionId) return;
    sentInitial.current = sessionId;
    navigate(location.pathname, { replace: true, state: null });
    void handleSendMessage(initialPrompt);
  }, [session, initialPrompt, sessionId, navigate, location.pathname, handleSendMessage]);

  // keep the newest message in view while the reader is at the bottom
  const count = session?.conversation.length ?? 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottom) el.scrollTo({ top: el.scrollHeight, behavior: count > 1 ? "smooth" : "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, isSending, liveSteps.length, liveText]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
  };

  if (isLoading && !session) {
    return (
      <div className="mx-auto w-full max-w-[760px] space-y-8 px-5 pt-12">
        <Skeleton className="ml-auto h-11 w-2/3 rounded-[22px]" />
        <div className="flex gap-4">
          <Skeleton className="size-7 rounded-full" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-28 w-full rounded-[20px]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState type="default" title="This task didn't load" description={error} onRetry={getSession} showRetryButton fullHeight centered />
    );
  }

  if (!session) {
    return (
      <ErrorState
        type="notFound"
        title="Task not found"
        description="It may have been deleted, or the link is from another account."
        showRetryButton={false}
        fullHeight
        centered
      />
    );
  }

  const title = session.title || sessionTitle(session.conversation) || "New task";

  return (
    <div className="relative flex h-full flex-col bg-paper">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line/70 px-5">
        <h1 className="min-w-0 flex-1 truncate font-serif text-[17px] font-medium tracking-[-0.01em]">{title}</h1>
        {session.createdAt && <span className="hidden text-[13px] text-ink-faint sm:block">{formatDate(session.createdAt)}</span>}
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[760px] space-y-8 px-4 pt-8 pb-10 sm:px-6">
          {session.conversation.length === 0 && !isSending && (
            <p className="pt-10 text-center font-serif text-lg text-ink-soft">Ask anything to get this task started.</p>
          )}
          {session.conversation.map((msg) =>
            msg.isError || msg.sender === "system" ? (
              <ErrorMessage key={msg.messageId} msg={msg} onRetry={handleSendMessage} retrying={isSending} />
            ) : msg.sender === "user" ? (
              <UserMessage key={msg.messageId} msg={msg} />
            ) : (
              <AgentMessage key={msg.messageId} msg={msg} />
            )
          )}
          {isSending && <LiveReply steps={liveSteps} text={liveText} />}
        </div>
      </div>

      {!atBottom && (
        <button
          type="button"
          onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })}
          className="absolute bottom-32 left-1/2 inline-flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-raised text-ink shadow-float animate-rise-sm hover:bg-paper-2"
          aria-label="Scroll to the latest message"
        >
          <ArrowDown className="size-4" />
        </button>
      )}

      <div className="shrink-0 px-4 pb-4 sm:px-6 sm:pb-5">
        <div className="mx-auto w-full max-w-[760px]">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isSending}
            placeholder="Reply to GoPilot…"
            autoFocus
            onOpenWorkflows={() => setPickerOpen(true)}
          />
          <p className="mt-2 text-center text-[12px] text-ink-faint">GoPilot acts in your Google apps. Check sent mail and events it reports.</p>
        </div>
      </div>
      <WorkflowPicker open={pickerOpen} setOpen={setPickerOpen} onRun={runWorkflow} />
    </div>
  );
}

export default SessionChat;
