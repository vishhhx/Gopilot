import { useState, type KeyboardEvent } from "react";
import {
  Plus,
  Sparkles,
  Clock,
  ChevronDown,
  ArrowUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface ChatInputProps {
  onSendMessage: (message: string) => void | Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({
  onSendMessage,
  isLoading = false,
  placeholder = "How can I help you today?",
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || isLoading || disabled) return;

    await onSendMessage(message);
    setMessage("");
    setIsExpanded(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isLoading || disabled) {
      e.preventDefault();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className=" flex items-center justify-center  max-w-4xl w-full">
      <div className="w-full">
        <div className="relative rounded-3xl shadow-lg border p-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsExpanded(true)}
            placeholder={isLoading ? "Sending..." : placeholder}
            className="min-h-[56px] bg-transparent border-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base pr-24"
            rows={isExpanded ? 4 : 1}
            disabled={isLoading || disabled}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg"
                disabled={isLoading || disabled}
              >
                <Plus className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg"
                disabled={isLoading || disabled}
              >
                <Sparkles className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg"
                disabled={isLoading || disabled}
              >
                <Clock className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="h-9 px-3 rounded-lg flex items-center gap-1"
                disabled={isLoading || disabled}
              >
                <span className="text-sm">Gpt-4.0</span>
                <ChevronDown className="h-4 w-4" />
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={!message.trim() || isLoading || disabled}
                size="icon"
                className="h-9 w-9 rounded-lg"
                aria-label={isLoading ? "Sending…" : "Send message"}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowUp className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
