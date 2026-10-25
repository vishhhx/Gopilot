import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Blossom } from "@/components/bloom/Blossom";
import { Flower } from "@/components/bloom/Flowers";
import { AgentMessage, UserMessage } from "@/components/chat/Messages";
import { Thinking } from "@/components/chat/Thinking";
import type { ChatMessage, DynamicContent } from "@/lib/chat";
import { SERVICES, type ServiceId } from "@/lib/services";
import { Reveal } from "./Reveal";

/* Sample requests, answered with sample data, rendered by the same components the chat uses. */

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
function nextWeekday(day: number, hour: number, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() + (((day - d.getDay() + 7) % 7) || 7));
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

interface Scenario {
  id: string;
  prompt: string;
  services: ServiceId[];
  steps: string[];
  reply: string;
  cards: DynamicContent[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "mail",
    prompt: "Summarize my unread mail from this morning",
    services: ["gmail"],
    steps: ["Reading your request", "Asking the Gmail reader", "Writing the summary"],
    reply:
      "You have **4 unread emails** since 8 AM. Two need a reply today:\n\n- **Priya Raman** wants the Q3 deck before Thursday's review.\n- **Northwind Billing** says invoice 2041 is due on Friday.\n\nThe other two are a newsletter and a calendar update.",
    cards: [
      { name: "Priya Raman <priya@example.com>", subject: "Q3 deck before Thursday?", snippet: "Could you send the latest version before the review? I'd like to read it on the train.", h: 1 },
      { name: "Northwind Billing <billing@example.com>", subject: "Invoice 2041 is due Friday", snippet: "This is a reminder that invoice 2041 for ₹18,400 is due on Friday.", h: 2 },
      { name: "The Weekly Garden <news@example.com>", subject: "Ten plants that like shade", snippet: "This week: ferns, hostas and the quiet joy of moss.", h: 3 },
      { name: "Calendar <calendar@example.com>", subject: "Updated: Design sync moved to 4 PM", snippet: "Arjun moved Design sync from 3 PM to 4 PM.", h: 3.5 },
    ].map((e) => ({
      type: "gmail",
      metadata: { from: e.name, subject: e.subject, snippet: e.snippet, date: hoursAgo(e.h), labels: ["UNREAD"], operation: "read" },
    })),
  },
  {
    id: "meet",
    prompt: "Find 30 minutes with Priya on Friday and send a Meet link",
    services: ["calendar", "meet"],
    steps: ["Reading your request", "Checking both calendars", "Creating the Meet", "Sending the invite"],
    reply: "Priya is free from **3:00 to 3:30 PM on Friday**, so I booked it and sent her an invite with a Meet link.",
    cards: [
      {
        type: "google_meet",
        metadata: {
          summary: "Q3 deck review",
          startTime: nextWeekday(5, 15),
          endTime: nextWeekday(5, 15, 30),
          meetLink: "https://meet.google.com/",
          attendees: [
            { email: "priya@example.com", displayName: "Priya Raman", responseStatus: "needsAction" },
            { email: "you@example.com", displayName: "You", responseStatus: "accepted" },
          ],
          operation: "created",
        },
      },
    ],
  },
  {
    id: "invoices",
    prompt: "Log this week's invoices from Drive in my Expenses sheet",
    services: ["drive", "sheets"],
    steps: ["Reading your request", "Searching Drive", "Reading the invoices", "Adding rows to Expenses 2026"],
    reply:
      "I found **4 invoices** added to Drive this week and added them as rows 18 to 21 in **Expenses 2026**, with the vendor, amount and due date of each.",
    cards: [
      ["Northwind invoice 2041.pdf", 182_000],
      ["Fernhill Studio, October.pdf", 96_000],
      ["Courier receipts week 43.pdf", 41_000],
      ["Cloud hosting, October.pdf", 120_000],
    ].map(([name, size], i) => ({
      type: "drive",
      metadata: { fileName: name as string, operation: "file_listed" },
      data: { mimeType: "application/pdf", size: size as number, createdTime: hoursAgo(24 * (i + 1)) },
    })),
  },
  {
    id: "form",
    prompt: "Make a feedback form for Thursday's workshop",
    services: ["forms"],
    steps: ["Reading your request", "Writing the questions", "Creating the form"],
    reply: "Your form **Workshop feedback** is ready with 5 questions. Share the link with everyone after the session.",
    cards: [
      {
        type: "form",
        metadata: { formTitle: "Workshop feedback", questionCount: 5, responseCount: 0, operation: "created" },
        data: {
          questions: [
            { title: "How useful was the workshop overall?", type: "SCALE" },
            { title: "Which part did you find most valuable?", type: "MULTIPLE_CHOICE" },
            { title: "Was the pace right for you?", type: "MULTIPLE_CHOICE" },
            { title: "What should we change next time?", type: "PARAGRAPH" },
            { title: "Would you come to another one?", type: "MULTIPLE_CHOICE" },
          ],
        },
      },
    ],
  },
];

type Phase = "idle" | "asked" | "thinking" | "answered";

function toMessage(s: Scenario): ChatMessage {
  return {
    messageId: `demo-${s.id}`,
    sender: "agent",
    content: s.reply,
    isDynamic: true,
    dynamicContent: s.cards,
    timestamp: new Date().toISOString(),
    fresh: true,
  };
}

const STEP_MS = 650;

export function AgentDemo() {
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const windowRef = useRef<HTMLDivElement>(null);
  const inView = useInView(windowRef, { once: true, margin: "-120px" });
  const scenario = SCENARIOS[active];

  useEffect(() => {
    if (!inView) return;
    setPhase("asked");
    const t1 = setTimeout(() => setPhase("thinking"), 700);
    const t2 = setTimeout(() => setPhase("answered"), 700 + scenario.steps.length * STEP_MS + 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [inView, active, run, scenario.steps.length]);

  const pick = (i: number) => {
    if (i === active) setRun((r) => r + 1);
    else setActive(i);
  };

  return (
    <section id="how" className="scroll-mt-16 bg-paper-2 py-28 sm:py-36">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="lg:pt-6">
          <Reveal>
            <h2 className="font-serif text-[clamp(38px,4.6vw,64px)] leading-[1.02] font-normal tracking-[-0.03em]">
              Ask once. The right agents answer.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-6 max-w-[42ch] text-[18px] leading-relaxed text-ink">
              The orchestrator reads what you want, hands each part to the agent for that app, and brings back
              what they did as cards you can open. Pick a request to watch it happen.
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <div role="radiogroup" aria-label="Example requests" className="mt-9 space-y-2">
              {SCENARIOS.map((s, i) => {
                const on = i === active;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => pick(i)}
                    className={cn(
                      "group flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition-[background-color,transform] duration-300",
                      on ? "bg-raised shadow-float" : "hover:bg-paper-3/70 active:scale-[0.99]"
                    )}
                  >
                    <span className="flex shrink-0 -space-x-1.5">
                      {s.services.map((svc, j) => (
                        <span
                          key={svc}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-full ring-2 transition-transform duration-500 ease-[var(--ease-bloom)]",
                            SERVICES[svc].bgWash,
                            on ? "ring-raised" : "ring-paper-2",
                            on && "rotate-[18deg]"
                          )}
                          style={{ transitionDelay: `${j * 60}ms` }}
                        >
                          <Flower service={svc} size={24} />
                        </span>
                      ))}
                    </span>
                    <span className={cn("min-w-0 flex-1 text-[16px] leading-snug", on ? "text-ink" : "text-ink-soft group-hover:text-ink")}>
                      {s.prompt}
                    </span>
                    {on && phase === "answered" && (
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-soft animate-fade" aria-hidden>
                        <RotateCcw className="size-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div
            ref={windowRef}
            data-ui
            className="overflow-hidden rounded-[28px] border border-line bg-paper shadow-float"
            aria-label="Example conversation"
          >
            <div className="flex h-12 items-center gap-2.5 border-b border-line px-5">
              <Blossom size={18} active={phase === "idle" ? [] : scenario.services} />
              <span className="truncate font-serif text-[15px] text-ink">{scenario.prompt}</span>
            </div>
            <div className="h-[600px] overflow-hidden px-4 pt-7 sm:h-[620px] sm:px-7">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${active}-${run}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  className="space-y-7"
                >
                  {phase !== "idle" && (
                    <UserMessage
                      msg={{
                        messageId: `u-${scenario.id}`,
                        sender: "user",
                        content: scenario.prompt,
                        isDynamic: false,
                        dynamicContent: [],
                        timestamp: new Date().toISOString(),
                      }}
                    />
                  )}
                  {phase === "thinking" && (
                    <Thinking steps={scenario.steps} services={scenario.services} every={STEP_MS} showTimer={false} />
                  )}
                  {phase === "answered" && <AgentMessage msg={toMessage(scenario)} actions={false} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <p className="mt-3 text-center text-[13px] text-ink-soft">An example request, shown with sample data.</p>
        </Reveal>
      </div>
    </section>
  );
}
