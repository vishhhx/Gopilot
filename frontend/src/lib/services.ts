import {
  CalendarDays,
  ClipboardList,
  FolderClosed,
  Mail,
  Sheet,
  Video,
  type LucideIcon,
} from "lucide-react";

/**
 * The six Google services GoPilot's agents work in. Each one is a petal of the blossom motif and
 * keeps the same flower colour everywhere it appears: chat cards, workflow nodes, the landing page.
 * Class names are written out in full so Tailwind can see them.
 */
export type ServiceId = "gmail" | "calendar" | "drive" | "sheets" | "meet" | "forms";

export interface ServiceInfo {
  id: ServiceId;
  name: string;
  flower: string;
  icon: LucideIcon;
  /** CSS colour values, for SVG fills and inline styles */
  petal: string;
  deep: string;
  wash: string;
  /** Tailwind classes */
  bgPetal: string;
  bgWash: string;
  textDeep: string;
  borderPetal: string;
  ringPetal: string;
  /** what the agents can do, in the user's words */
  does: string;
}

export const SERVICE_ORDER: ServiceId[] = ["gmail", "calendar", "drive", "sheets", "meet", "forms"];

export const SERVICES: Record<ServiceId, ServiceInfo> = {
  gmail: {
    id: "gmail",
    name: "Gmail",
    flower: "peony",
    icon: Mail,
    petal: "var(--peony)",
    deep: "var(--peony-deep)",
    wash: "var(--peony-wash)",
    bgPetal: "bg-peony",
    bgWash: "bg-peony-wash",
    textDeep: "text-peony-deep",
    borderPetal: "border-peony",
    ringPetal: "ring-peony",
    does: "Reads, sends, replies to, forwards, archives and trashes mail.",
  },
  calendar: {
    id: "calendar",
    name: "Calendar",
    flower: "buttercup",
    icon: CalendarDays,
    petal: "var(--buttercup)",
    deep: "var(--buttercup-deep)",
    wash: "var(--buttercup-wash)",
    bgPetal: "bg-buttercup",
    bgWash: "bg-buttercup-wash",
    textDeep: "text-buttercup-deep",
    borderPetal: "border-buttercup",
    ringPetal: "ring-buttercup",
    does: "Finds free time, creates and updates events, and clears what you cancel.",
  },
  drive: {
    id: "drive",
    name: "Drive",
    flower: "sage",
    icon: FolderClosed,
    petal: "var(--sage)",
    deep: "var(--sage-deep)",
    wash: "var(--sage-wash)",
    bgPetal: "bg-sage",
    bgWash: "bg-sage-wash",
    textDeep: "text-sage-deep",
    borderPetal: "border-sage",
    ringPetal: "ring-sage",
    does: "Searches, uploads, shares and tidies files and folders.",
  },
  sheets: {
    id: "sheets",
    name: "Sheets",
    flower: "mint",
    icon: Sheet,
    petal: "var(--mint)",
    deep: "var(--mint-deep)",
    wash: "var(--mint-wash)",
    bgPetal: "bg-mint",
    bgWash: "bg-mint-wash",
    textDeep: "text-mint-deep",
    borderPetal: "border-mint",
    ringPetal: "ring-mint",
    does: "Reads ranges, writes values, formats cells and manages tabs.",
  },
  meet: {
    id: "meet",
    name: "Meet",
    flower: "cornflower",
    icon: Video,
    petal: "var(--cornflower)",
    deep: "var(--cornflower-deep)",
    wash: "var(--cornflower-wash)",
    bgPetal: "bg-cornflower",
    bgWash: "bg-cornflower-wash",
    textDeep: "text-cornflower-deep",
    borderPetal: "border-cornflower",
    ringPetal: "ring-cornflower",
    does: "Sets up meetings with a link, invites guests, moves and cancels them.",
  },
  forms: {
    id: "forms",
    name: "Forms",
    flower: "lavender",
    icon: ClipboardList,
    petal: "var(--lavender)",
    deep: "var(--lavender-deep)",
    wash: "var(--lavender-wash)",
    bgPetal: "bg-lavender",
    bgWash: "bg-lavender-wash",
    textDeep: "text-lavender-deep",
    borderPetal: "border-lavender",
    ringPetal: "ring-lavender",
    does: "Builds forms, adds questions and reads or exports responses.",
  },
};

/** Maps any service-ish string the backend sends (type, service, agent name) to a petal. */
export function resolveService(raw?: string | null): ServiceId | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("gmail") || s === "email" || s.includes("mail")) return "gmail";
  if (s.includes("meet")) return "meet";
  if (s.includes("calendar") || s.includes("calender") || s === "event") return "calendar";
  if (s.includes("sheet") || s.includes("spreadsheet")) return "sheets";
  if (s.includes("drive")) return "drive";
  if (s.includes("form")) return "forms";
  return null;
}

/** "gmailReaderAgent" -> "Gmail reader", "sheetsFormattingAgent" -> "Sheets formatting" */
export function humanizeAgentName(name?: string): string {
  if (!name) return "Agent";
  const words = name
    .replace(/Agent$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .map((w) => w.toLowerCase());
  if (words.length === 0) return "Agent";
  const svc = resolveService(words[0]);
  if (svc) words[0] = SERVICES[svc].name;
  else words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(" ");
}

/** Unique services used by a list of workflow nodes, in petal order. */
export function servicesInNodes(
  nodes: { type?: string; data?: Record<string, unknown> | null }[] | undefined
): ServiceId[] {
  const found = new Set<ServiceId>();
  for (const n of nodes ?? []) {
    if (n?.type !== "Agent") continue;
    const svc =
      resolveService(String(n.data?.service ?? "")) ?? resolveService(String(n.data?.name ?? ""));
    if (svc) found.add(svc);
  }
  return SERVICE_ORDER.filter((s) => found.has(s));
}
