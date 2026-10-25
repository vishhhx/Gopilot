import { useState } from "react";
import {
  CheckCircle2,
  CircleHelp,
  Clock3,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderClosed,
  MapPin,
  Paperclip,
  Presentation,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { field, people, type DynamicContent, type Person } from "@/lib/chat";
import { formatBytes, formatDate, formatDateTime, formatRelative, formatTime, plural } from "@/lib/format";
import { resolveService, SERVICES } from "@/lib/services";
import {
  CardShell,
  CopyButton,
  Expandable,
  OpenLink,
  parseAddress,
  PersonBadge,
} from "./shared";

type CardProps = { item: DynamicContent; delay?: number };

const meta = (item: DynamicContent) => (item.metadata ?? {}) as Record<string, unknown>;
const data = (item: DynamicContent) => (item.data ?? {}) as Record<string, unknown>;

/* ---------------- Gmail ---------------- */

export function GmailCard({ item, delay }: CardProps) {
  const m = meta(item);
  const d = data(item);
  const from = parseAddress(field(m, "from"));
  const to = (Array.isArray(m.to) ? (m.to as string[]) : []).map(parseAddress);
  const labels = (Array.isArray(m.labels) ? (m.labels as string[]) : []).filter(
    (l) => !/^(CATEGORY_|INBOX$|UNREAD$|IMPORTANT$|SENT$)/.test(l)
  );
  const attachments = Array.isArray(d.attachments)
    ? (d.attachments as { filename?: string; size?: number }[])
    : [];
  const body = field(d, "body");
  const subject = field(m, "subject") || item.title || "(no subject)";
  const date = field(m, "date");

  return (
    <CardShell
      service="gmail"
      op={field(m, "operation")}
      delay={delay}
      footer={item.url ? <OpenLink href={item.url}>Open in Gmail</OpenLink> : undefined}
    >
      <h4 className="font-serif text-[17px] leading-snug font-medium text-ink">{subject}</h4>
      <div className="mt-2.5 flex items-center gap-2.5">
        <PersonBadge name={from.name} email={from.email} />
        <div className="min-w-0 flex-1 text-[14px] leading-tight">
          <p className="truncate font-medium text-ink">{from.name || from.email || "Unknown sender"}</p>
          {to.length > 0 && (
            <p className="truncate text-[13px] text-ink-soft">
              to {to.slice(0, 2).map((t) => t.name || t.email).join(", ")}
              {to.length > 2 && ` and ${to.length - 2} more`}
            </p>
          )}
        </div>
        {date && (
          <time className="shrink-0 text-[13px] text-ink-faint tabular-nums" dateTime={date} title={formatDateTime(date)}>
            {formatRelative(date)}
          </time>
        )}
      </div>
      {field(m, "snippet") && (
        <p className="mt-3 line-clamp-3 text-[14.5px] leading-relaxed text-ink-soft">{field(m, "snippet")}</p>
      )}
      {(labels.length > 0 || attachments.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {attachments.map((a, i) => (
            <span
              key={`a${i}`}
              className="inline-flex h-7 items-center gap-1.5 rounded-full bg-paper-2 px-2.5 text-[12.5px] text-ink"
            >
              <Paperclip className="size-3 text-ink-soft" />
              <span className="max-w-[180px] truncate">{a.filename || "Attachment"}</span>
              {a.size ? <span className="text-ink-faint">{formatBytes(a.size)}</span> : null}
            </span>
          ))}
          {labels.map((l) => (
            <span key={l} className="inline-flex h-7 items-center rounded-full bg-peony-wash px-2.5 text-[12.5px] text-peony-deep">
              {l.replace(/_/g, " ").toLowerCase()}
            </span>
          ))}
        </div>
      )}
      {body && (
        <Expandable label="Show full email" less="Hide email">
          <div className="max-h-80 overflow-y-auto rounded-2xl bg-paper-2 p-3.5 text-[14px] leading-relaxed whitespace-pre-wrap text-ink">
            {body}
          </div>
        </Expandable>
      )}
    </CardShell>
  );
}

/** Many emails at once read better as a list; a row opens into the full card. */
export function GmailList({ items, delay }: { items: DynamicContent[]; delay?: number }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? items : items.slice(0, 5);
  const op = field(meta(items[0]), "operation");
  const sameOp = items.every((i) => field(meta(i), "operation") === op);

  return (
    <CardShell service="gmail" label={plural(items.length, "email")} op={sameOp ? op : undefined} delay={delay}>
      <ul className="-mx-2">
        {shown.map((it, i) => {
          const m = meta(it);
          const from = parseAddress(field(m, "from"));
          const unread = Array.isArray(m.labels) && (m.labels as string[]).includes("UNREAD");
          if (openIdx === i)
            return (
              <li key={i} className="px-2 py-2">
                <GmailCard item={it} />
                <button
                  type="button"
                  onClick={() => setOpenIdx(null)}
                  className="mt-2 text-[13px] font-medium text-clay-ink hover:underline underline-offset-4"
                >
                  Back to the list
                </button>
              </li>
            );
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => setOpenIdx(i)}
                className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-paper-2"
              >
                <PersonBadge name={from.name} email={from.email} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={cn("truncate text-[14px]", unread ? "font-semibold text-ink" : "text-ink")}>
                      {from.name || from.email || "Unknown sender"}
                    </span>
                    <span className="ml-auto shrink-0 text-[12.5px] text-ink-faint tabular-nums">
                      {formatRelative(field(m, "date"))}
                    </span>
                  </span>
                  <span className={cn("block truncate text-[14px]", unread ? "font-medium text-ink" : "text-ink-soft")}>
                    {field(m, "subject") || it.title || "(no subject)"}
                  </span>
                  {field(m, "snippet") && (
                    <span className="block truncate text-[13px] text-ink-faint">{field(m, "snippet")}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {items.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="mt-1 text-[13px] font-medium text-clay-ink hover:underline underline-offset-4"
        >
          {showAll ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </CardShell>
  );
}

/* ---------------- Calendar & Meet ---------------- */

function DateTile({ when, tone }: { when?: string; tone: "buttercup" | "cornflower" }) {
  const d = when ? new Date(when) : null;
  const valid = d && !Number.isNaN(d.getTime());
  return (
    <div
      className={cn(
        "flex w-[62px] shrink-0 flex-col items-center justify-center rounded-2xl py-2",
        tone === "buttercup" ? "bg-buttercup-wash text-buttercup-deep" : "bg-cornflower-wash text-cornflower-deep"
      )}
      aria-hidden
    >
      {valid ? (
        <>
          <span className="text-[12px] font-medium">{d.toLocaleDateString(undefined, { month: "short" })}</span>
          <span className="font-serif text-[28px] leading-none font-medium text-ink">{d.getDate()}</span>
          <span className="mt-0.5 text-[12px]">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
        </>
      ) : (
        <Clock3 className="my-3 size-6" />
      )}
    </div>
  );
}

function timeRange(start?: string, end?: string): string {
  if (!start) return "";
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  if (Number.isNaN(s.getTime())) return start;
  if (!e || Number.isNaN(e.getTime())) return formatDateTime(start);
  const sameDay = s.toDateString() === e.toDateString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) return "All day";
  return sameDay
    ? `${formatTime(s)} – ${formatTime(e)}`
    : `${formatDateTime(s)} – ${formatDateTime(e)}`;
}

const RSVP: Record<string, { icon: typeof CheckCircle2; label: string; cls: string }> = {
  accepted: { icon: CheckCircle2, label: "Going", cls: "text-sage-deep" },
  declined: { icon: XCircle, label: "Declined", cls: "text-danger" },
  tentative: { icon: CircleHelp, label: "Maybe", cls: "text-buttercup-deep" },
  needsAction: { icon: Clock3, label: "No reply yet", cls: "text-ink-faint" },
};

function Guests({ list }: { list: Person[] }) {
  if (list.length === 0) return null;
  return (
    <Expandable label={`See ${plural(list.length, "guest")}`} less="Hide guests">
      <ul className="space-y-1.5">
        {list.map((p, i) => {
          const r = p.responseStatus ? RSVP[p.responseStatus] : undefined;
          return (
            <li key={i} className="flex items-center gap-2.5 text-[14px]">
              <PersonBadge name={p.displayName} email={p.email} size={26} />
              <span className="min-w-0 flex-1 truncate">{p.displayName || p.email}</span>
              {r && (
                <span className={cn("inline-flex items-center gap-1 text-[12.5px]", r.cls)}>
                  <r.icon className="size-3.5" />
                  {r.label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Expandable>
  );
}

function GuestFaces({ list }: { list: Person[] }) {
  if (list.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1.5">
        {list.slice(0, 5).map((p, i) => (
          <PersonBadge key={i} name={p.displayName} email={p.email} size={24} />
        ))}
      </div>
      {list.length > 5 && <span className="text-[12.5px] text-ink-faint">and {list.length - 5} more</span>}
    </div>
  );
}

export function CalendarCard({ item, delay }: CardProps) {
  const m = meta(item);
  const start = field(m, "start", "startTime");
  const end = field(m, "end", "endTime");
  const guests = people(m.attendees);
  const title = field(m, "summary") || item.title || "Event";
  const description = field(m, "description");

  return (
    <CardShell
      service="calendar"
      op={field(m, "operation")}
      delay={delay}
      footer={item.url ? <OpenLink href={item.url}>Open in Calendar</OpenLink> : undefined}
    >
      <div className="flex gap-3.5">
        <DateTile when={start} tone="buttercup" />
        <div className="min-w-0 flex-1">
          <h4 className="font-serif text-[17px] leading-snug font-medium">{title}</h4>
          <p className="mt-1 flex items-center gap-1.5 text-[14px] text-ink tabular-nums">
            <Clock3 className="size-3.5 text-ink-soft" />
            {timeRange(start, end) || "Time not set"}
          </p>
          {field(m, "location") && (
            <p className="mt-1 flex items-center gap-1.5 text-[14px] text-ink-soft">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{field(m, "location")}</span>
            </p>
          )}
          {guests.length > 0 && (
            <div className="mt-2.5">
              <GuestFaces list={guests} />
            </div>
          )}
        </div>
      </div>
      {description && (
        <p className="mt-3 line-clamp-4 text-[14px] leading-relaxed whitespace-pre-wrap text-ink-soft">{description}</p>
      )}
      <Guests list={guests} />
    </CardShell>
  );
}

export function MeetCard({ item, delay }: CardProps) {
  const m = meta(item);
  const d = data(item);
  const start = field(m, "startTime", "start");
  const end = field(m, "endTime", "end");
  const link = field(m, "meetLink", "url") || item.url || undefined;
  const guests = people(m.attendees);
  const status = field(m, "status");
  const cancelled = status === "cancelled" || field(m, "operation") === "cancelled";

  return (
    <CardShell
      service="meet"
      op={field(m, "operation") || status}
      delay={delay}
      footer={
        link && !cancelled ? (
          <>
            <a
              href={link}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-cornflower px-3.5 text-[13px] font-semibold text-ink dark:text-paper transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Video className="size-3.5" />
              Join meeting
            </a>
            <CopyButton text={link} />
            {item.url && item.url !== link && <OpenLink href={item.url}>Open in Calendar</OpenLink>}
          </>
        ) : undefined
      }
    >
      <div className="flex gap-3.5">
        <DateTile when={start} tone="cornflower" />
        <div className="min-w-0 flex-1">
          <h4 className={cn("font-serif text-[17px] leading-snug font-medium", cancelled && "line-through decoration-1 text-ink-soft")}>
            {field(m, "summary") || item.title || "Google Meet"}
          </h4>
          <p className="mt-1 flex items-center gap-1.5 text-[14px] tabular-nums">
            <Clock3 className="size-3.5 text-ink-soft" />
            {timeRange(start, end) || "Time not set"}
            {field(m, "timeZone") && <span className="text-ink-faint">({field(m, "timeZone")})</span>}
          </p>
          {link && (
            <p className="mt-1 truncate text-[13.5px] text-cornflower-deep">{link.replace(/^https?:\/\//, "")}</p>
          )}
          {guests.length > 0 && (
            <div className="mt-2.5">
              <GuestFaces list={guests} />
            </div>
          )}
        </div>
      </div>
      {field(d, "description") && (
        <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-ink-soft">{field(d, "description")}</p>
      )}
      <Guests list={guests} />
    </CardShell>
  );
}

/* ---------------- Drive ---------------- */

function fileIcon(mime?: string, isFolder?: boolean) {
  if (isFolder || mime?.includes("folder")) return FolderClosed;
  if (!mime) return File;
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv")) return FileSpreadsheet;
  if (mime.includes("presentation") || mime.includes("powerpoint")) return Presentation;
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime.includes("pdf") || mime.includes("document") || mime.includes("text") || mime.includes("word")) return FileText;
  return File;
}

function fileKind(mime?: string, isFolder?: boolean): string {
  if (isFolder || mime?.includes("folder")) return "Folder";
  if (!mime) return "File";
  if (mime.includes("google-apps.document")) return "Google Doc";
  if (mime.includes("google-apps.spreadsheet")) return "Google Sheet";
  if (mime.includes("google-apps.presentation")) return "Google Slides";
  if (mime.includes("google-apps.form")) return "Google Form";
  if (mime.includes("pdf")) return "PDF";
  if (mime.startsWith("image/")) return "Image";
  if (mime.startsWith("video/")) return "Video";
  const sub = mime.split("/")[1];
  return sub ? sub.toUpperCase().slice(0, 8) : "File";
}

function DriveRow({ item }: { item: DynamicContent }) {
  const m = meta(item);
  const d = data(item);
  const op = field(m, "operation") ?? "";
  const isFolder = op.startsWith("folder");
  const mime = field(d, "mimeType");
  const Icon = fileIcon(mime, isFolder);
  const shared = Array.isArray(d.sharedWith) ? (d.sharedWith as string[]) : [];
  const facts = [fileKind(mime, isFolder), formatBytes(field(d, "size")), field(d, "createdTime") && `added ${formatDate(field(d, "createdTime"))}`].filter(Boolean);
  const href = field(d, "webViewLink") || item.url || undefined;

  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sage-wash text-sage-deep">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer noopener" className="block truncate text-[14.5px] font-medium text-ink hover:underline underline-offset-4">
            {field(m, "fileName") || item.title || "Untitled"}
          </a>
        ) : (
          <p className="truncate text-[14.5px] font-medium">{field(m, "fileName") || item.title || "Untitled"}</p>
        )}
        <p className="truncate text-[13px] text-ink-soft">{facts.join(", ")}</p>
        {shared.length > 0 && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[12.5px] text-ink-faint">
            <Users className="size-3" /> Shared with {shared.slice(0, 2).join(", ")}
            {shared.length > 2 && ` and ${shared.length - 2} more`}
          </p>
        )}
      </div>
    </div>
  );
}

export function DriveCard({ item, delay }: CardProps) {
  const m = meta(item);
  const d = data(item);
  return (
    <CardShell
      service="drive"
      op={field(m, "operation")}
      delay={delay}
      footer={
        field(d, "webViewLink") || item.url || field(d, "webContentLink") ? (
          <>
            <OpenLink href={field(d, "webViewLink") || item.url}>Open in Drive</OpenLink>
            <OpenLink href={field(d, "webContentLink")}>Download</OpenLink>
          </>
        ) : undefined
      }
    >
      <DriveRow item={item} />
    </CardShell>
  );
}

export function DriveList({ items, delay }: { items: DynamicContent[]; delay?: number }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? items : items.slice(0, 6);
  const op = field(meta(items[0]), "operation");
  return (
    <CardShell
      service="drive"
      label={plural(items.length, "item")}
      op={items.every((i) => field(meta(i), "operation") === op) ? op : undefined}
      delay={delay}
    >
      <ul className="space-y-3">
        {shown.map((it, i) => (
          <li key={i}>
            <DriveRow item={it} />
          </li>
        ))}
      </ul>
      {items.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="mt-3 text-[13px] font-medium text-clay-ink hover:underline underline-offset-4"
        >
          {showAll ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </CardShell>
  );
}

/* ---------------- Forms ---------------- */

export function FormCard({ item, delay }: CardProps) {
  const m = meta(item);
  const d = data(item);
  const questions = Array.isArray(d.questions) ? (d.questions as { id?: string; title?: string; type?: string }[]) : [];
  const analytics = (d.analytics ?? {}) as { totalResponses?: number | null; completionRate?: number | null };
  const qCount = typeof m.questionCount === "number" ? m.questionCount : questions.length || undefined;
  const rCount =
    typeof m.responseCount === "number"
      ? m.responseCount
      : typeof analytics.totalResponses === "number"
        ? analytics.totalResponses
        : undefined;
  const rate = typeof analytics.completionRate === "number" ? analytics.completionRate : undefined;
  const pct = rate === undefined ? undefined : Math.round(rate <= 1 ? rate * 100 : rate);
  const share = field(d, "shortLink", "shareableLink");

  return (
    <CardShell
      service="forms"
      op={field(m, "operation")}
      delay={delay}
      footer={
        item.url || share ? (
          <>
            <OpenLink href={item.url || share}>Open form</OpenLink>
            <CopyButton text={share} label="Copy share link" />
          </>
        ) : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-serif text-[17px] leading-snug font-medium">{field(m, "formTitle") || item.title || "Form"}</h4>
        {field(m, "status") && field(m, "status") !== "active" && (
          <span className="rounded-full bg-paper-2 px-2.5 py-0.5 text-[12px] text-ink-soft">{field(m, "status")}</span>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <dt className="text-[12.5px] text-ink-soft">Questions</dt>
          <dd className="font-serif text-[22px] tabular-nums">{qCount ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-ink-soft">Responses</dt>
          <dd className="font-serif text-[22px] tabular-nums">{rCount ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-ink-soft">Completed</dt>
          <dd className="font-serif text-[22px] tabular-nums">{pct === undefined ? "—" : `${pct}%`}</dd>
        </div>
      </dl>
      {pct !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-lavender-wash" aria-hidden>
          <div className="h-full rounded-full bg-lavender transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
      )}
      {questions.length > 0 && (
        <ol className="mt-3 space-y-1 text-[14px]">
          {questions.slice(0, 4).map((q, i) => (
            <li key={q.id ?? i} className="flex gap-2">
              <span className="w-5 shrink-0 text-right text-ink-faint tabular-nums">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate">{q.title || "Untitled question"}</span>
              {q.type && <span className="shrink-0 text-[12.5px] text-ink-faint">{q.type.replace(/_/g, " ").toLowerCase()}</span>}
            </li>
          ))}
          {questions.length > 4 && <li className="pl-7 text-[13px] text-ink-faint">and {questions.length - 4} more</li>}
        </ol>
      )}
    </CardShell>
  );
}

/* ---------------- anything else ---------------- */

function scalarEntries(obj: Record<string, unknown>): [string, string][] {
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && (typeof v !== "object" || Array.isArray(v)))
    .map(([k, v]) => [
      k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
      Array.isArray(v) ? v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ") : String(v),
    ]);
}

export function GenericCard({ item, delay }: CardProps) {
  const service = resolveService(item.type);
  const m = meta(item);
  const rows = scalarEntries(m).filter(([k]) => k !== "Operation").slice(0, 8);
  return (
    <CardShell
      service={service}
      label={service ? SERVICES[service].name : item.type?.replace(/_/g, " ") || "Result"}
      op={field(m, "operation")}
      delay={delay}
      footer={item.url ? <OpenLink href={item.url}>Open</OpenLink> : undefined}
    >
      {item.title && <h4 className="font-serif text-[17px] leading-snug font-medium">{item.title}</h4>}
      {rows.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ink-soft">{k}</dt>
              <dd className="min-w-0 truncate" title={v}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <Expandable label="Show raw details" less="Hide raw details">
        <pre className="max-h-72 overflow-auto rounded-2xl bg-paper-2 p-3 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap">
          {JSON.stringify({ metadata: item.metadata, data: item.data }, null, 2)}
        </pre>
      </Expandable>
    </CardShell>
  );
}
