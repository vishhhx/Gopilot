import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Blossom } from "@/components/bloom/Blossom";

type ErrorType = "default" | "network" | "server" | "notFound" | "timeout" | "unauthorized" | "validation";

const DEFAULTS: Record<ErrorType, { title: string; description: string }> = {
  default: { title: "Something went wrong", description: "Try again in a moment." },
  network: { title: "GoPilot can't reach its server", description: "Check your connection, then try again." },
  server: { title: "The server ran into a problem", description: "Try again in a few moments." },
  notFound: { title: "Nothing here", description: "It may have been deleted, or the link is out of date." },
  timeout: { title: "That took too long", description: "The request timed out. Try again." },
  unauthorized: { title: "You don't have access", description: "Sign in with the account that owns this, then try again." },
  validation: { title: "Something needs fixing", description: "Check what you entered and try again." },
};

export interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  description?: string;
  onRetry?: () => void | Promise<void>;
  retryText?: string;
  showRetryButton?: boolean;
  isRetrying?: boolean;
  fullHeight?: boolean;
  centered?: boolean;
  className?: string;
  children?: ReactNode;
}

/** A closed blossom, a plain sentence about what happened, and a way to try again. */
export function ErrorState({
  type = "default",
  title,
  description,
  onRetry,
  retryText = "Try again",
  showRetryButton = true,
  isRetrying = false,
  fullHeight = false,
  centered = true,
  className,
  children,
}: ErrorStateProps) {
  const d = DEFAULTS[type];
  const quiet = type === "notFound";
  return (
    <div
      role="alert"
      className={cn(
        "flex w-full flex-col px-6 py-10 animate-rise-sm",
        centered && "items-center text-center",
        fullHeight && "min-h-full justify-center",
        className
      )}
    >
      <Blossom size={56} active={[]} centre={quiet ? "var(--ink-faint)" : "var(--danger)"} motion="sway" />
      <h2 className="mt-5 font-serif text-[24px] tracking-[-0.015em] text-ink">{title ?? d.title}</h2>
      <p className="mt-2 max-w-[44ch] text-[15px] leading-relaxed text-ink-soft">{description ?? d.description}</p>
      {children}
      {onRetry && showRetryButton && (
        <Button variant="outline" className="mt-6" onClick={() => void onRetry()} disabled={isRetrying}>
          {isRetrying ? <Blossom size={16} motion="loading" /> : <RotateCcw className="size-4" />}
          {retryText}
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
