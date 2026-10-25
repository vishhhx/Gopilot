import { useState, type CSSProperties, type ReactNode } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SERVICES, type ServiceId } from "@/lib/services";
import { copyText, hashIndex, initials } from "@/lib/format";
import { AppLogo } from "@/components/bloom/AppLogo";

type Tone = "service" | "neutral" | "danger";

const OPS: Record<string, { label: string; tone: Tone }> = {
  read: { label: "Read", tone: "neutral" },
  sent: { label: "Sent", tone: "service" },
  deleted: { label: "Deleted", tone: "danger" },
  archived: { label: "Archived", tone: "neutral" },
  trashed: { label: "Moved to trash", tone: "danger" },
  forwarded: { label: "Forwarded", tone: "service" },
  replied: { label: "Replied", tone: "service" },
  marked_as_spam: { label: "Marked as spam", tone: "danger" },
  created: { label: "Created", tone: "service" },
  updated: { label: "Updated", tone: "service" },
  cancelled: { label: "Cancelled", tone: "danger" },
  confirmed: { label: "Confirmed", tone: "service" },
  tentative: { label: "Tentative", tone: "neutral" },
  attendees_added: { label: "Guests added", tone: "service" },
  attendees_removed: { label: "Guests removed", tone: "neutral" },
  moved: { label: "Rescheduled", tone: "service" },
  folder_created: { label: "Folder created", tone: "service" },
  folder_listed: { label: "Folder", tone: "neutral" },
  folder_deleted: { label: "Folder deleted", tone: "danger" },
  file_uploaded: { label: "Uploaded", tone: "service" },
  file_listed: { label: "File", tone: "neutral" },
  file_deleted: { label: "Deleted", tone: "danger" },
  file_shared: { label: "Shared", tone: "service" },
  search_performed: { label: "Search result", tone: "neutral" },
  quota_checked: { label: "Storage", tone: "neutral" },
  duplicated: { label: "Duplicated", tone: "service" },
  question_added: { label: "Question added", tone: "service" },
  question_removed: { label: "Question removed", tone: "neutral" },
  response_submitted: { label: "Response sent", tone: "service" },
  response_viewed: { label: "Responses", tone: "neutral" },
  responses_exported: { label: "Exported", tone: "service" },
  response_deleted: { label: "Response deleted", tone: "danger" },
  responses_cleared: { label: "Responses cleared", tone: "danger" },
  active: { label: "Accepting responses", tone: "service" },
  draft: { label: "Draft", tone: "neutral" },
};

export function OpPill({ op, service }: { op?: string; service: ServiceId | null }) {
  if (!op) return null;
  const known = OPS[op.toLowerCase()];
  const label = known?.label ?? op.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  const tone = known?.tone ?? "neutral";
  const svc = service ? SERVICES[service] : null;
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap",
        tone === "danger" && "bg-danger-wash text-danger",
        tone === "neutral" && "bg-paper-2 text-ink-soft",
        tone === "service" && (svc ? cn(svc.bgWash, svc.textDeep) : "bg-paper-2 text-ink")
      )}
    >
      {label}
    </span>
  );
}

export function ServiceMark({ service, size = "sm" }: { service: ServiceId | null; size?: "sm" | "md" }) {
  if (service) return <AppLogo service={service} size={size === "sm" ? 20 : 30} badge={size === "md"} />;
  return <span className={cn("shrink-0 rounded-full bg-paper-2", size === "sm" ? "size-6" : "size-9")} aria-hidden />;
}

export function CardShell({
  service,
  label,
  op,
  children,
  footer,
  delay = 0,
  className,
}: {
  service: ServiceId | null;
  label?: string;
  op?: string;
  children: ReactNode;
  footer?: ReactNode;
  delay?: number;
  className?: string;
}) {
  const svc = service ? SERVICES[service] : null;
  return (
    <article
      data-ui
      className={cn(
        "overflow-hidden rounded-[20px] border border-line bg-raised transition-[border-color,transform] duration-300 animate-rise-sm hover:border-(--card-petal)",
        className
      )}
      style={{ animationDelay: `${delay}ms`, "--card-petal": svc?.petal ?? "var(--line-strong)" } as CSSProperties}
    >
      <header className="flex items-center gap-2 px-4 pt-3.5 text-[13px] text-ink-soft">
        <ServiceMark service={service} />
        <span className="font-medium">{label ?? svc?.name ?? "Result"}</span>
        <span className="ml-auto">
          <OpPill op={op} service={service} />
        </span>
      </header>
      <div className="px-4 pt-2.5 pb-4">{children}</div>
      {footer && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-paper-2/50 px-3 py-2.5">
          {footer}
        </footer>
      )}
    </article>
  );
}

export function OpenLink({ href, children }: { href?: string | null; children: ReactNode }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink transition-colors hover:bg-paper-3"
    >
      <ExternalLink className="size-3.5 text-ink-soft" />
      {children}
    </a>
  );
}

export function CopyButton({ text, label = "Copy link" }: { text?: string | null; label?: string }) {
  const [done, setDone] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          toast.success("Copied to clipboard");
          setTimeout(() => setDone(false), 1800);
        } else toast.error("Couldn't copy. Select the text and copy it instead.");
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink transition-colors hover:bg-paper-3"
    >
      {done ? <Check className="size-3.5 text-sage-deep" /> : <Copy className="size-3.5 text-ink-soft" />}
      {done ? "Copied" : label}
    </button>
  );
}

const PERSON_TINTS = [
  "bg-peony-wash text-peony-deep",
  "bg-buttercup-wash text-buttercup-deep",
  "bg-sage-wash text-sage-deep",
  "bg-mint-wash text-mint-deep",
  "bg-cornflower-wash text-cornflower-deep",
  "bg-lavender-wash text-lavender-deep",
];

/** A person's stable initial badge, tinted by a hash of their address. */
export function PersonBadge({ name, email, size = 28 }: { name?: string; email?: string; size?: number }) {
  const key = email || name || "?";
  return (
    <span
      title={name && email ? `${name} <${email}>` : key}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-raised",
        PERSON_TINTS[hashIndex(key, PERSON_TINTS.length)]
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name || email?.split("@")[0])}
    </span>
  );
}

/** "Priya Raman <priya@x.com>" -> { name, email } */
export function parseAddress(raw?: string): { name?: string; email?: string } {
  if (!raw) return {};
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(raw);
  if (m) return { name: m[1].trim() || undefined, email: m[2].trim() };
  return raw.includes("@") ? { email: raw.trim() } : { name: raw.trim() };
}

export function Expandable({
  children,
  label,
  less = "Show less",
}: {
  children: ReactNode;
  label: string;
  less?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {open && <div className="mt-3 animate-rise-sm">{children}</div>}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-2 text-[13px] font-medium text-clay-ink hover:underline underline-offset-4"
      >
        {open ? less : label}
      </button>
    </div>
  );
}
