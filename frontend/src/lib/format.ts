/** Pulls a readable message out of an axios error, or anything else that was thrown. */
export function errorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  return e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;
}

function toDate(d?: string | number | Date | null): Date | null {
  if (d === undefined || d === null || d === "") return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Oct 24, 7:32 PM" */
export function formatDateTime(d?: string | number | Date | null): string {
  const date = toDate(d);
  if (!date) return typeof d === "string" ? d : "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Oct 24, 2026" */
export function formatDate(d?: string | number | Date | null): string {
  const date = toDate(d);
  if (!date) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** "7:32 PM" */
export function formatTime(d?: string | number | Date | null): string {
  const date = toDate(d);
  if (!date) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "Just now", "5 min ago", "3 h ago", "Yesterday", "Oct 12" */
export function formatRelative(d?: string | number | Date | null): string {
  const date = toDate(d);
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "2.4 MB" from a byte count given as a number or a numeric string. */
export function formatBytes(raw?: string | number | null): string {
  if (raw === undefined || raw === null || raw === "") return "";
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

/** A Mongo ObjectId carries its creation time in its first four bytes. */
export function objectIdDate(id?: string): Date | null {
  if (!id || !/^[a-f0-9]{24}$/i.test(id)) return null;
  return new Date(parseInt(id.slice(0, 8), 16) * 1000);
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

/** Stable small hash for picking a petal colour from an id or a name. */
export function hashIndex(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
