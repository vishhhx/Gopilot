import type { DynamicContent } from "@/lib/chat";
import { resolveService, type ServiceId } from "@/lib/services";
import {
  CalendarCard,
  DriveCard,
  DriveList,
  FormCard,
  GenericCard,
  GmailCard,
  GmailList,
  MeetCard,
} from "./cards";
import { WorkflowRunCard } from "./WorkflowRunCard";

type Kind = ServiceId | "workflow" | "other";

function kindOf(item: DynamicContent): Kind {
  const t = (item.type || "").toLowerCase();
  if (t === "workflow") return "workflow";
  if (t === "google_meet" || t === "google-meet" || t === "meet" || t === "google_meet_event") return "meet";
  if (t === "gmail" || t === "email") return "gmail";
  if (t === "calendar" || t === "event") return "calendar";
  if (t === "drive") return "drive";
  if (t === "form" || t === "forms") return "forms";
  return resolveService(t) ?? "other";
}

/**
 * Renders what the agents produced as cards in each service's flower colour.
 * Runs of more than three emails or files collapse into one list card.
 */
export function ResponseCards({ items, delay = 0 }: { items: DynamicContent[]; delay?: number }) {
  if (!items?.length) return null;

  // group consecutive items of the same kind
  const groups: { kind: Kind; items: DynamicContent[] }[] = [];
  for (const it of items) {
    const kind = kindOf(it);
    const last = groups[groups.length - 1];
    if (last && last.kind === kind) last.items.push(it);
    else groups.push({ kind, items: [it] });
  }

  let n = 0;
  const step = () => delay + n++ * 70;

  return (
    <div className="space-y-3">
      {groups.map((g, gi) => {
        if (g.kind === "gmail" && g.items.length > 3) return <GmailList key={gi} items={g.items} delay={step()} />;
        if (g.kind === "drive" && g.items.length > 3) return <DriveList key={gi} items={g.items} delay={step()} />;
        return g.items.map((it, i) => {
          const key = `${gi}-${i}`;
          const d = step();
          switch (g.kind) {
            case "gmail":
              return <GmailCard key={key} item={it} delay={d} />;
            case "calendar":
              return <CalendarCard key={key} item={it} delay={d} />;
            case "meet":
              return <MeetCard key={key} item={it} delay={d} />;
            case "drive":
              return <DriveCard key={key} item={it} delay={d} />;
            case "forms":
              return <FormCard key={key} item={it} delay={d} />;
            case "workflow":
              return <WorkflowRunCard key={key} item={it} delay={d} />;
            default:
              return <GenericCard key={key} item={it} delay={d} />;
          }
        });
      })}
    </div>
  );
}
