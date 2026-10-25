import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { ArrowUp, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { Blossom } from "@/components/bloom/Blossom";

export interface ChatInputProps {
  onSendMessage: (message: string) => void | Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** controlled text, for suggestion chips that fill the composer */
  value?: string;
  onValueChange?: (v: string) => void;
  autoFocus?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  variant?: "hero" | "docked";
  className?: string;
  /** shows a "Run a workflow" button that calls this */
  onOpenWorkflows?: () => void;
}

const MAX_HEIGHT = 240;

export default function ChatInput({
  onSendMessage,
  isLoading = false,
  placeholder = "How can I help you today?",
  disabled = false,
  value,
  onValueChange,
  autoFocus = false,
  inputRef,
  variant = "docked",
  className,
  onOpenWorkflows,
}: ChatInputProps) {
  const [inner, setInner] = useState("");
  const message = value ?? inner;
  const setMessage = (v: string) => (onValueChange ? onValueChange(v) : setInner(v));
  const localRef = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? localRef;
  const hero = variant === "hero";
  const blocked = isLoading || disabled;
  const canSend = message.trim().length > 0 && !blocked;

  // grow with the text, up to a cap
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [message, ref]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus, ref]);

  const handleSubmit = async () => {
    if (!canSend) return;
    const text = message.trim();
    setMessage("");
    await onSendMessage(text);
    ref.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <form
      className={cn(
        "group/composer relative w-full rounded-[26px] border border-line-strong bg-raised shadow-float transition-[border-color,box-shadow] duration-300",
        "focus-within:border-clay/45 focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--clay)_10%,transparent),var(--float-shadow)]",
        hero ? "p-3 sm:p-4" : "p-2.5 sm:p-3",
        className
      )}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <label htmlFor="composer" className="sr-only">
        Message GoPilot
      </label>
      <textarea
        id="composer"
        ref={ref}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={hero ? 2 : 1}
        disabled={disabled}
        className={cn(
          "block w-full resize-none bg-transparent px-2 text-ink outline-none placeholder:text-ink-faint disabled:opacity-60",
          hero ? "min-h-[64px] pt-1.5 text-[17px] leading-relaxed" : "min-h-[28px] pt-1 text-[16px] leading-relaxed"
        )}
        style={{ maxHeight: MAX_HEIGHT }}
      />
      <div className="mt-2 flex items-center justify-between gap-3 pl-2">
        <div className="flex min-w-0 items-center gap-2">
          {onOpenWorkflows && (
            <button
              type="button"
              onClick={onOpenWorkflows}
              disabled={blocked}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line bg-paper-2 px-3 text-[13px] font-medium text-ink transition-colors hover:bg-paper-3 disabled:opacity-50"
            >
              <Workflow className="size-3.5 text-clay-ink" />
              Run a workflow
            </button>
          )}
          <p className="flex min-w-0 items-center gap-2 text-[13px] text-ink-faint">
            <Blossom size={16} className="shrink-0 opacity-90" />
            <span className={cn("truncate", onOpenWorkflows && "hidden sm:inline")}>
              {isLoading ? "GoPilot is working…" : "GoPilot picks the agents for you"}
            </span>
          </p>
        </div>
        <button
          type="submit"
          disabled={!canSend}
          aria-label={isLoading ? "Sending" : "Send message"}
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-[var(--ease-bloom)]",
            canSend
              ? "bg-clay text-on-clay hover:bg-clay-hover hover:scale-105 active:scale-95"
              : "bg-paper-3 text-ink-faint"
          )}
        >
          {isLoading ? <Blossom size={20} motion="loading" /> : <ArrowUp className="size-[18px]" strokeWidth={2.4} />}
        </button>
      </div>
    </form>
  );
}
