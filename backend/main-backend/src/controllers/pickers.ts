import { Request, Response } from "express";
import { google } from "googleapis";
import { ApiResponse, asyncHandler } from "../utils";
import { ENV } from "../config";
import { getServiceTokens, type ServiceToken } from "../services/serviceTokens";

/*
  GET /pickers/:kind?q=  Lists things from the user's Google account for the Run dialog's pickers,
  so a workflow input like "Spreadsheet" is chosen from a list instead of pasting an id.
*/

interface PickerItem {
  id: string;
  name: string;
  hint?: string;
}

const MIME = {
  spreadsheet: "application/vnd.google-apps.spreadsheet",
  form: "application/vnd.google-apps.form",
  drive_folder: "application/vnd.google-apps.folder",
} as const;

/** Which connections can list each kind, best first. */
const SOURCES: Record<string, string[]> = {
  spreadsheet: ["drive", "sheets"],
  drive_file: ["drive"],
  drive_folder: ["drive"],
  form: ["drive", "form", "forms"],
  gmail_label: ["gmail"],
  calendar: ["calendar"],
};

const APP_NAMES: Record<string, string> = {
  spreadsheet: "Google Drive or Google Sheets",
  drive_file: "Google Drive",
  drive_folder: "Google Drive",
  form: "Google Drive or Google Forms",
  gmail_label: "Gmail",
  calendar: "Google Calendar",
};

const authFor = (token: ServiceToken) => {
  const client = new google.auth.OAuth2(ENV.GOOGLE_CLIENT_ID, ENV.GOOGLE_CLIENT_SECRET, ENV.GOOGLE_REDIRECT_URI);
  client.setCredentials({ refresh_token: token.refreshToken });
  return client;
};

const shortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : undefined;

const listDrive = async (token: ServiceToken, kind: string, q: string): Promise<PickerItem[]> => {
  const drive = google.drive({ version: "v3", auth: authFor(token) });
  const filters = ["trashed=false"];
  if (kind === "drive_file") filters.push(`mimeType!='${MIME.drive_folder}'`);
  else filters.push(`mimeType='${MIME[kind as keyof typeof MIME]}'`);
  if (q) filters.push(`name contains '${q.replace(/['\\]/g, "\\$&")}'`);
  const { data } = await drive.files.list({
    q: filters.join(" and "),
    orderBy: "modifiedTime desc",
    pageSize: 25,
    fields: "files(id,name,modifiedTime)",
  });
  return (data.files ?? []).map((f) => ({ id: f.id!, name: f.name ?? "Untitled", hint: shortDate(f.modifiedTime) && `Edited ${shortDate(f.modifiedTime)}` }));
};

const listLabels = async (token: ServiceToken, q: string): Promise<PickerItem[]> => {
  const gmail = google.gmail({ version: "v1", auth: authFor(token) });
  const { data } = await gmail.users.labels.list({ userId: "me" });
  return (data.labels ?? [])
    .filter((l) => !q || l.name?.toLowerCase().includes(q.toLowerCase()))
    .map((l) => ({ id: l.id!, name: l.name ?? l.id!, hint: l.type === "system" ? "Gmail label" : "Your label" }));
};

const listCalendars = async (token: ServiceToken, q: string): Promise<PickerItem[]> => {
  const calendar = google.calendar({ version: "v3", auth: authFor(token) });
  const { data } = await calendar.calendarList.list({ maxResults: 100 });
  return (data.items ?? [])
    .filter((c) => !q || c.summary?.toLowerCase().includes(q.toLowerCase()))
    .map((c) => ({ id: c.id!, name: c.summaryOverride ?? c.summary ?? c.id!, hint: c.primary ? "Your main calendar" : undefined }));
};

export const listPickerItems = asyncHandler(async (req: Request, res: Response) => {
  const { kind } = req.params;
  const sources = SOURCES[kind];
  if (!sources) return res.status(400).json(new ApiResponse(400, null, "Unknown picker"));
  const q = String(req.query.q ?? "").trim().slice(0, 100);

  const tokens = await getServiceTokens(req.user.userId);
  const usable = sources.map((s) => tokens.find((t) => t.service === s)).filter(Boolean) as ServiceToken[];
  if (!usable.length) {
    return res.status(400).json(new ApiResponse(400, null, `Connect ${APP_NAMES[kind]} in Settings > Connected apps to pick from your account.`));
  }

  let lastError: unknown;
  for (const token of usable) {
    try {
      const items =
        kind === "gmail_label" ? await listLabels(token, q) : kind === "calendar" ? await listCalendars(token, q) : await listDrive(token, kind, q);
      return res.status(200).json(new ApiResponse(200, { items }, ""));
    } catch (err) {
      lastError = err; // e.g. this connection lacks the permission; try the next one
    }
  }
  const message = (lastError as Error)?.message ?? "";
  console.error(`[pickers] ${kind} failed:`, message);
  // the Google API itself is switched off in the app's Cloud project, not a user permission problem
  const disabled = message.match(/(\S+) API has not been used in project|https:\/\/console\.developers\.google\.com\/apis\/api\/\S+/);
  if (disabled) {
    const link = message.match(/https:\/\/console\.developers\.google\.com\/apis\/api\/\S+/)?.[0];
    return res
      .status(502)
      .json(new ApiResponse(502, null, `This API is turned off in GoPilot's Google Cloud project. Turn it on${link ? ` at ${link}` : ""}, wait a minute, then try again. You can paste a link instead for now.`));
  }
  return res
    .status(502)
    .json(new ApiResponse(502, null, `Couldn't list from ${APP_NAMES[kind]}. Reconnect it in Settings and grant all permissions, or paste a link instead.`));
});
