import type { Agent } from "@openai/agents";
import { gmailDeleteAgent, gmailReaderAgent, gmailTrashAgent, gmailWriterAgent } from "../agents/gmail";
import {
  sheetsFormattingAgent,
  sheetsHelperAgent,
  sheetsManagementAgent,
  sheetsReaderAgent,
  sheetsStructureAgent,
  sheetsWriterAgent,
} from "../agents/sheet";
import { calendarDeleteAgent, calendarReaderAgent, calendarWriterAgent } from "../agents/calender";
import { meetCreatorAgent, meetDeleteAgent, meetEditorAgent, meetReaderAgent } from "../agents/meet";
import { driveDeleteAgent, driveReaderAgent, driveSharerAgent, driveUploaderAgent } from "../agents/drive";
import { formCreatorAgent, formDeleteAgent, formEditorAgent, formReaderAgent } from "../agents/form";

export interface WorkflowAgent {
  service: "gmail" | "sheets" | "calendar" | "meet" | "drive" | "forms";
  name: string;
  description: string;
  agent: Agent<any, any>;
}

/** Every agent a workflow step can run. The canvas palette and the AI generator use these names. */
export const WORKFLOW_AGENTS: WorkflowAgent[] = [
  { service: "gmail", name: "gmailReaderAgent", description: "Search and read emails", agent: gmailReaderAgent },
  { service: "gmail", name: "gmailWriterAgent", description: "Send, reply to and forward emails", agent: gmailWriterAgent },
  { service: "gmail", name: "gmailTrashAgent", description: "Trash, archive, label or mark emails as spam", agent: gmailTrashAgent },
  { service: "gmail", name: "gmailDeleteAgent", description: "Permanently delete emails", agent: gmailDeleteAgent },

  { service: "sheets", name: "sheetsReaderAgent", description: "Read spreadsheet values and metadata", agent: sheetsReaderAgent },
  { service: "sheets", name: "sheetsWriterAgent", description: "Write, update or append cell values", agent: sheetsWriterAgent },
  { service: "sheets", name: "sheetsManagementAgent", description: "Create spreadsheets and manage sheet tabs", agent: sheetsManagementAgent },
  { service: "sheets", name: "sheetsStructureAgent", description: "Insert or delete rows and columns", agent: sheetsStructureAgent },
  { service: "sheets", name: "sheetsFormattingAgent", description: "Format cells: colours, fonts, borders", agent: sheetsFormattingAgent },
  { service: "sheets", name: "sheetsHelperAgent", description: "Find rows, the last row, or a sheet by name", agent: sheetsHelperAgent },

  { service: "calendar", name: "calendarReaderAgent", description: "List and read calendar events", agent: calendarReaderAgent },
  { service: "calendar", name: "calendarWriterAgent", description: "Create or update calendar events", agent: calendarWriterAgent },
  { service: "calendar", name: "calendarDeleteAgent", description: "Delete calendar events", agent: calendarDeleteAgent },

  { service: "meet", name: "meetCreatorAgent", description: "Schedule meetings with Meet links", agent: meetCreatorAgent },
  { service: "meet", name: "meetReaderAgent", description: "List and read meetings", agent: meetReaderAgent },
  { service: "meet", name: "meetEditorAgent", description: "Reschedule meetings and manage guests", agent: meetEditorAgent },
  { service: "meet", name: "meetDeleteAgent", description: "Cancel or delete meetings", agent: meetDeleteAgent },

  { service: "drive", name: "driveReaderAgent", description: "Find and list Drive files and folders", agent: driveReaderAgent },
  { service: "drive", name: "driveUploaderAgent", description: "Create folders and upload files", agent: driveUploaderAgent },
  { service: "drive", name: "driveSharerAgent", description: "Share files and folders", agent: driveSharerAgent },
  { service: "drive", name: "driveDeleteAgent", description: "Delete Drive files and folders", agent: driveDeleteAgent },

  { service: "forms", name: "formCreatorAgent", description: "Create or duplicate Google Forms", agent: formCreatorAgent },
  { service: "forms", name: "formReaderAgent", description: "Read forms and summarize responses", agent: formReaderAgent },
  { service: "forms", name: "formEditorAgent", description: "Edit form questions and settings", agent: formEditorAgent },
  { service: "forms", name: "formDeleteAgent", description: "Move forms to the trash", agent: formDeleteAgent },
];

export const findWorkflowAgent = (name?: string) => WORKFLOW_AGENTS.find((a) => a.name === name);

export const SERVICE_ICONS: Record<WorkflowAgent["service"], string> = {
  gmail: "/public/icons/Gmail.svg",
  sheets: "/public/icons/Sheets.svg",
  calendar: "/public/icons/Calendar.svg",
  meet: "/public/icons/Meet.svg",
  drive: "/public/icons/Drive.svg",
  forms: "/public/icons/Forms.svg",
};
