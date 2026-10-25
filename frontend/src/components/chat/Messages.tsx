import { useState } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/chat";
import { copyText, formatDateTime, formatTime } from "@/lib/format";
import { Blossom } from "@/components/bloom/Blossom";
import { ResponseCards } from "@/components/responses/ResponseCards";
import { resolveService, SERVICE_ORDER, SERVICES, type ServiceId } from "@/lib/services";
import { Markdown, revealDuration } from "./Markdown";
import { AppLogo } from "@/components/bloom/AppLogo";

function CopyAction({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy message"
      title="Copy"
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } else toast.error("Couldn't copy this message");
      }}
      className="inline-flex size-7 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-paper-2 hover:text-ink"
    >
      {done ? <Check className="size-3.5 text-sage-deep" /> : <Copy className="size-3.5" />}
    </button>
  );
}

export function UserMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="group flex flex-col items-end gap-1 animate-rise-sm">
      <div className="max-w-[min(85%,560px)] rounded-[22px] rounded-br-md bg-paper-3/70 px-4 py-2.5 text-[16px] leading-relaxed whitespace-pre-wrap text-ink">
        {msg.content}
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        <time className="text-[12px] text-ink-faint" dateTime={msg.timestamp} title={formatDateTime(msg.timestamp)}>
          {formatTime(msg.timestamp)}
        </time>
        <CopyAction text={msg.content} />
      </div>
    </div>
  );
}

/** The apps whose agents produced this reply, in petal order. */
function servicesUsed(msg: ChatMessage): ServiceId[] {
  const found = new Set<ServiceId>();
  for (const d of msg.dynamicContent) {
    const s = resolveService(d.type);
    if (s) found.add(s);
  }
  return SERVICE_ORDER.filter((s) => found.has(s));
}

export function AgentMessage({ msg, actions = true }: { msg: ChatMessage; actions?: boolean }) {
  const reveal = Boolean(msg.fresh);
  const cardsDelay = reveal ? Math.min(revealDuration(msg.content) * 0.6, 1200) : 0;
  const used = servicesUsed(msg);

  return (
    <div className="group flex gap-3 sm:gap-4">
      <div className="pt-1">
        <Blossom size={26} motion={reveal ? "bloom" : "none"} />
      </div>
      <div className="min-w-0 flex-1">
        {used.length > 0 && (
          <p className={cn("mb-2 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-soft", reveal && "animate-fade")}>
            <span>Worked in</span>
            {used.map((s) => (
              <span
                key={s}
                className={cn("inline-flex h-6 items-center gap-1 rounded-full pr-2.5 pl-1", SERVICES[s].bgWash, SERVICES[s].textDeep)}
              >
                <AppLogo service={s} size={16} />
                <span className="font-medium">{SERVICES[s].name}</span>
              </span>
            ))}
          </p>
        )}
        {msg.content.trim() && <Markdown text={msg.content} reveal={reveal} />}
        {msg.dynamicContent.length > 0 && (
          <div className={cn(msg.content.trim() && "mt-4")}>
            <ResponseCards items={msg.dynamicContent} delay={cardsDelay} />
          </div>
        )}
        {actions && (
          <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            <CopyAction text={msg.content} />
            <time className="text-[12px] text-ink-faint" dateTime={msg.timestamp} title={formatDateTime(msg.timestamp)}>
              {formatTime(msg.timestamp)}
            </time>
          </div>
        )}
      </div>
    </div>
  );
}

export function ErrorMessage({
  msg,
  onRetry,
  retrying,
}: {
  msg: ChatMessage;
  onRetry?: (prompt: string) => void;
  retrying?: boolean;
}) {
  return (
    <div className="flex gap-3 sm:gap-4 animate-rise-sm" role="alert">
      <div className="pt-1">
        <Blossom size={26} active={[]} centre="var(--danger)" />
      </div>
      <div className="min-w-0 flex-1 rounded-2xl bg-danger-wash px-4 py-3">
        <p className="text-[15px] font-medium text-ink">That request didn't go through.</p>
        <p className="mt-0.5 text-[14px] text-ink-soft">{msg.content}</p>
        {msg.retryPrompt && onRetry && (
          <button
            type="button"
            disabled={retrying}
            onClick={() => onRetry(msg.retryPrompt!)}
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-raised px-3 text-[13px] font-medium text-ink transition-colors hover:bg-paper-2 disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
