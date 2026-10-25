// Seeds the Google app definitions shown on Settings > Connected apps.
// Safe to re-run: existing apps are kept; only permissions they lack are appended.
// Usage: npm run seed:connections
import mongoose from "mongoose";
import { connectDb } from "../config/mongoDb";
import { ConnectionDefinition } from "../models/connect/connectionDefinition";

const G = "https://www.googleapis.com/auth/";

// `service` must match what the tools filter tokens by (see src/tools/*).
const definitions = [
  {
    provider: "google",
    service: "gmail",
    displayName: "Gmail",
    description: "Read, draft and send email from your Gmail inbox.",
    iconUrl: "/public/icons/Gmail.svg",
    scopes: [
      { name: `${G}gmail.readonly`, description: "Read your email messages and settings" },
      { name: `${G}gmail.send`, description: "Send email on your behalf" },
      { name: `${G}gmail.compose`, description: "Create and manage drafts" },
      { name: `${G}gmail.modify`, description: "Label, archive and organise your email" },
    ],
  },
  {
    provider: "google",
    service: "calendar",
    displayName: "Google Calendar",
    description: "See your schedule, create events and set up Meet calls.",
    iconUrl: "/public/icons/Calendar.svg",
    scopes: [
      { name: `${G}calendar.readonly`, description: "View your calendars and events" },
      { name: `${G}calendar.events`, description: "Create, edit and delete events (including Meet links)" },
      { name: `${G}calendar`, description: "Fully manage your calendars" },
    ],
  },
  {
    provider: "google",
    service: "meet",
    displayName: "Google Meet",
    description: "Create Meet spaces and look up meetings you've hosted.",
    iconUrl: "/public/icons/Meet.svg",
    scopes: [
      { name: `${G}meetings.space.created`, description: "Create and manage Meet spaces you start" },
      { name: `${G}meetings.space.readonly`, description: "View details of your Meet spaces" },
      { name: `${G}calendar.events`, description: "Schedule meetings on your calendar" },
    ],
  },
  {
    provider: "google",
    service: "sheets",
    displayName: "Google Sheets",
    description: "Create spreadsheets and read or update their data.",
    iconUrl: "/public/icons/Sheets.svg",
    scopes: [
      { name: `${G}spreadsheets.readonly`, description: "View your spreadsheets" },
      { name: `${G}spreadsheets`, description: "Create and edit your spreadsheets" },
      { name: `${G}drive.file`, description: "Access spreadsheets GoPilot creates" },
    ],
  },
  {
    provider: "google",
    service: "drive",
    displayName: "Google Drive",
    description: "Find, upload, share and organise files in your Drive.",
    iconUrl: "/public/icons/Drive.svg",
    scopes: [
      { name: `${G}drive.readonly`, description: "View and download your Drive files" },
      { name: `${G}drive.file`, description: "Manage files GoPilot creates or opens" },
      { name: `${G}drive`, description: "Fully manage all your Drive files" },
    ],
  },
  {
    provider: "google",
    service: "form",
    displayName: "Google Forms",
    description: "Build forms and read the responses they collect.",
    iconUrl: "/public/icons/Forms.svg",
    scopes: [
      { name: `${G}forms.body.readonly`, description: "View your forms" },
      { name: `${G}forms.body`, description: "Create and edit your forms" },
      { name: `${G}forms.responses.readonly`, description: "View responses to your forms" },
      { name: `${G}drive.file`, description: "List, copy and trash the forms GoPilot creates" },
    ],
  },
];

const seed = async () => {
  await connectDb();
  for (const def of definitions) {
    const existing = await ConnectionDefinition.findOne({ provider: def.provider, service: def.service });
    if (!existing) {
      await ConnectionDefinition.create(def);
      console.log(`${def.service}: added`);
      continue;
    }
    // Append new permissions only: existing scope ids are referenced by users' connections.
    const known = new Set(existing.scopes.map((s) => s.name));
    const missing = def.scopes.filter((s) => !known.has(s.name));
    if (missing.length) {
      existing.scopes.push(...missing);
      await existing.save();
    }
    console.log(`${def.service}: already present${missing.length ? `, added ${missing.length} permission(s)` : ""}`);
  }
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
