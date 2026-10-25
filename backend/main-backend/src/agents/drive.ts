import { Agent, handoff } from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import {
  createFolderTool,
  getFolderByNameTool,
  listFoldersTool,
  deleteFolderTool,
  uploadFileTool,
  uploadCsvTool,
  uploadJsonTool,
  listFilesTool,
  getFileTool,
  deleteFileTool,
  searchFilesTool,
  sharePublicTool,
  shareWithEmailTool,
  getPermissionsTool,
  getStorageQuotaTool,
} from "../tools/drive";
import { z } from "zod";

const DynamicContentSchema = z.object({
  type: z.literal("drive"),
  title: z.string(),
  url: z.string().nullable(),
  metadata: z.object({
    fileId: z.string().nullable(),
    fileName: z.string(),
    folderId: z.string().nullable(),
    operation: z.enum([
      "folder_created",
      "folder_listed",
      "folder_deleted",
      "file_uploaded",
      "file_listed",
      "file_deleted",
      "file_shared",
      "search_performed",
      "quota_checked",
    ]),
  }),
  data: z
    .object({
      webViewLink: z.string().nullable(),
      webContentLink: z.string().nullable(),
      mimeType: z.string().nullable(),
      size: z.string().nullable(),
      createdTime: z.string().nullable(),
      sharedWith: z.array(z.string()).nullable(),
    })
    .nullable(),
});

const AgentResponseSchema = z.object({
  isDynamic: z.boolean(),
  content: z.string(),
  dynamicContent: z.array(DynamicContentSchema).nullable(),
});

const RESPONSE_FORMAT_INSTRUCTIONS = `
RESPONSE FORMAT:
- isDynamic: true for Drive data, false otherwise
- One dynamicContent entry per file/folder/operation
- Always include fileId/folderId, fileName, operation
- Include webViewLink for accessibility
- content: human-readable summary
`;

/* --- Drive Agents (specialized by task) --- */

export const driveReaderAgent = new Agent({
  name: "drive-reader-agent",
  handoffDescription: "List, search, and read files and folders.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Drive reader.
- List folders and files
- Search files by name
- Get file details
- Check storage quota
- Return structured summaries (id, name, link, type, size)
- If user wants actions after viewing (delete/share/etc.), present results then hand off
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [listFoldersTool, listFilesTool, getFileTool, searchFilesTool, getStorageQuotaTool],
  outputType: AgentResponseSchema,
});

export const driveUploaderAgent = new Agent({
  name: "drive-uploader-agent",
  handoffDescription: "Create folders and upload files.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Drive uploader.
- Create new folders
- Find folders by name
- Upload files (CSV, JSON, text)
- Return shareable links and file details
- Generate and return web view links
- Ask for confirmation if uploading large files
- Use operation "folder_created" for folders, "file_uploaded" for files
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [createFolderTool, getFolderByNameTool, uploadFileTool, uploadCsvTool, uploadJsonTool],
  outputType: AgentResponseSchema,
});

export const driveSharerAgent = new Agent({
  name: "drive-sharer-agent",
  handoffDescription: "Share files and folders with users.",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Drive sharer.
- Share files/folders publicly (anyone with link)
- Share with specific email addresses
- Get sharing permissions
- Set different roles (reader, writer, commenter)
- Return shareable links and permission details
- Use operation "file_shared" for sharing
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [sharePublicTool, shareWithEmailTool, getPermissionsTool],
  outputType: AgentResponseSchema,
});

export const driveDeleteAgent = new Agent({
  name: "drive-delete-agent",
  handoffDescription: "Delete files and folders (requires explicit confirmation).",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Drive delete agent.
CRITICAL:
- NEVER delete without explicit confirmation: allowed confirmations: "YES DELETE PERMANENTLY", "DELETE FOREVER", "CONFIRM PERMANENT DELETION"
- If confirmation not exact, present warning and ask again
- Warn user that deleted files are permanently removed
Process:
1) Expect file/folder IDs from previous agent
2) If explicit confirmation -> delete; else ask again
After deletion: set isDynamic:true with operation:"file_deleted"/"folder_deleted" and url:null
Before deletion (confirm stage): set isDynamic:false
${RESPONSE_FORMAT_INSTRUCTIONS}`,
  tools: [deleteFileTool, deleteFolderTool],
  outputType: AgentResponseSchema,
});

/* --- Coordinator and handoffs --- */
const driveHandoffs = [
  handoff(driveReaderAgent, {
    toolDescriptionOverride: "Default: list/search/read files and folders.",
  }),
  handoff(driveUploaderAgent, {
    toolDescriptionOverride: "Create folders and upload files.",
  }),
  handoff(driveSharerAgent, {
    toolDescriptionOverride: "Share files and manage permissions.",
  }),
  handoff(driveDeleteAgent, {
    toolDescriptionOverride:
      "Permanent deletion ONLY with explicit phrases like 'delete permanently' or 'erase permanently'.",
  }),
];

// export const driveCoordinatorAgent = new Agent({
//   name: "drive-coordinator-agent",
//   instructions: `${RECOMMENDED_PROMPT_PREFIX}
// You are the Google Drive coordinator (entry point).
// - Route to reader (default for view/list/search files and folders)
// - Route to uploader for creating folders or uploading files
// - Route to sharer for sharing files and managing permissions
// - Route to delete ONLY for explicit permanent-delete confirmations
// - For "show my files"/"list files" → reader
// - For "create folder"/"upload file" → uploader
// - For "share file"/"share with email" → sharer
// - For "delete file" or "find and delete" → reader first (so user can review)
// Default to reader if unclear.
// ${RESPONSE_FORMAT_INSTRUCTIONS}`,
//   tools: [],
//   handoffs: driveHandoffs,
//   outputType: AgentResponseSchema,
// });
export const driveCoordinatorAgent = new Agent({
  name: "drive-coordinator-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Google Drive COORDINATOR.

Your job is to decide which sub-agent handles the request.
NEVER perform Drive actions yourself.

📌 ROUTING RULES (STRICT)
- If user wants to **create a folder**, **upload a file**, or **create anything** → handoff to **drive-uploader-agent**
- If user wants to **list files**, **search**, **get metadata**, **preview**, or **view** → handoff to **drive-reader-agent**
- If user wants to **share a file/folder**, **update permissions** → handoff to **drive-sharer-agent**
- If user wants to **delete** something →  
    1. Handoff to **reader** first so user can confirm the actual file  
    2. Then uploader OR deleter agent can perform deletion
- If request is unclear → DEFAULT = **drive-reader-agent**

${RESPONSE_FORMAT_INSTRUCTIONS}`,

  tools: [],
  handoffs: driveHandoffs,
  outputType: AgentResponseSchema,
});

/* --- Internal agent handoffs (cross-routing) --- */

driveReaderAgent.handoffs = [
  handoff(driveUploaderAgent, {
    toolDescriptionOverride: "Create folders or upload files after viewing.",
  }),
  handoff(driveSharerAgent, {
    toolDescriptionOverride: "Share files after viewing.",
  }),
  handoff(driveDeleteAgent, {
    toolDescriptionOverride:
      "Permanent delete ONLY with explicit confirmation phrases.",
  }),
];

driveUploaderAgent.handoffs = [
  handoff(driveReaderAgent, {
    toolDescriptionOverride: "View uploaded files or list existing files.",
  }),
  handoff(driveSharerAgent, {
    toolDescriptionOverride: "Share newly uploaded files.",
  }),
];

driveSharerAgent.handoffs = [
  handoff(driveReaderAgent, {
    toolDescriptionOverride: "Return to reader to verify shares.",
  }),
  handoff(driveDeleteAgent, {
    toolDescriptionOverride: "Delete files if requested.",
  }),
];

driveDeleteAgent.handoffs = [
  handoff(driveReaderAgent, {
    toolDescriptionOverride: "Verify deletion results if requested.",
  }),
  handoff(driveUploaderAgent, {
    toolDescriptionOverride: "Switch to uploader if user changes mind.",
  }),
];

export default driveCoordinatorAgent;