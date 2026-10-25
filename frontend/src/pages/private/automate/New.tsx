import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ChatInput from "@/components/chat/ChatInput";
import { axiosInstance } from "@/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addSession } from "@/store/slices/sessionSlice";
import { Blossom } from "@/components/bloom/Blossom";
import { PetalDrift } from "@/components/bloom/PetalDrift";
import { Garden } from "@/components/bloom/Flowers";
import { BORDER } from "@/lib/garden";
import { SERVICES, type ServiceId } from "@/lib/services";
import { errorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/bloom/AppLogo";
import { WorkflowPicker } from "@/components/chat/WorkflowPicker";
import { workflowApi, type WorkflowSummary } from "@/lib/workflow";

const SUGGESTIONS: { service: ServiceId; text: string }[] = [
  { service: "gmail", text: "Summarize my unread emails from today" },
  { service: "calendar", text: "What's on my calendar tomorrow?" },
  { service: "meet", text: "Set up a 30-minute Meet on Friday at 3 PM" },
  { service: "drive", text: "Find the files shared with me this week" },
  { service: "sheets", text: "Read the first 10 rows of my budget sheet" },
  { service: "forms", text: "Create a feedback form with five questions" },
];

function greeting(name?: string) {
  const h = new Date().getHours();
  const part = h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
}

function New() {
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.authData);

  const handleSendMessage = async (message: string) => {
    try {
      setIsLoading(true);
      const { data } = await axiosInstance.post("/agent/init", { message });
      const sessionId: string = data.data.sessionId;

      dispatch(
        addSession({
          sessionId,
          _id: data.data._id,
          title: data.data.title || message.split("\n")[0].slice(0, 80),
          createdAt: new Date().toISOString(),
        })
      );

      // The chat page sends this first message once it opens the new session.
      navigate(`/task/${sessionId}`, { state: { initialPrompt: message } });
    } catch (err) {
      setDraft(message);
      toast.error("Couldn't start the task", { description: errorMessage(err, "Check your connection and try again.") });
    } finally {
      setIsLoading(false);
    }
  };

  // a new chat named after the workflow, with the run's card as its first reply
  const runWorkflow = async (wf: WorkflowSummary, values: Record<string, string>) => {
    const title = wf.title || "Untitled workflow";
    const { data } = await axiosInstance.post("/agent/init", { message: `Run "${title}"`, title });
    const sessionId: string = data.data.sessionId;
    await workflowApi.runInChat(sessionId, wf._id, values);
    dispatch(addSession({ sessionId, _id: data.data._id, title, createdAt: new Date().toISOString() }));
    navigate(`/task/${sessionId}`);
  };

  const applySuggestion = (text: string) => {
    setDraft(text);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      el?.setSelectionRange(text.length, text.length);
    });
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-y-auto px-4">
      <PetalDrift count={10} alpha={0.5} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 aspect-[1000/160]" aria-hidden>
        <Garden plants={BORDER} height={160} className="h-full w-full opacity-90" />
      </div>
      <div className="relative z-10 flex w-full max-w-[720px] flex-1 flex-col justify-center py-10 sm:py-16">
        <div className="mb-7 flex flex-col items-center gap-4 text-center sm:mb-9">
          <Blossom size={60} motion="bloom" className="animate-sway [animation-delay:900ms]" />
          <h1 className="font-serif text-[clamp(30px,4.4vw,44px)] leading-[1.08] font-normal tracking-[-0.025em] text-ink animate-rise [animation-delay:150ms]">
            {greeting(user?.name)}
          </h1>
        </div>

        <div className="animate-rise [animation-delay:260ms]">
          <ChatInput
            variant="hero"
            value={draft}
            onValueChange={setDraft}
            inputRef={inputRef}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            autoFocus
            placeholder="Ask GoPilot to read, send, schedule or file something…"
            onOpenWorkflows={() => setPickerOpen(true)}
          />
        </div>

        <ul className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Suggestions">
          {SUGGESTIONS.map((s, i) => {
            const svc = SERVICES[s.service];
            return (
              <li key={s.text} className="animate-rise-sm" style={{ animationDelay: `${380 + i * 60}ms` }}>
                <button
                  type="button"
                  onClick={() => applySuggestion(s.text)}
                  className={cn(
                    "group inline-flex h-9 items-center gap-2 rounded-full border border-line bg-raised/80 pr-3.5 pl-1.5 text-[14px] text-ink transition-all duration-200",
                    "hover:-translate-y-0.5 hover:border-(--chip-petal) hover:bg-raised"
                  )}
                  style={{ ["--chip-petal" as string]: svc.petal }}
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-paper-2 transition-transform duration-300 group-hover:scale-110">
                    <AppLogo service={s.service} size={15} badge={false} />
                  </span>
                  {s.text}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <WorkflowPicker open={pickerOpen} setOpen={setPickerOpen} onRun={runWorkflow} />
    </div>
  );
}

export default New;
