import { Agent } from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import { z } from "zod";
import {
 
  getSpreadsheetTool,
  getSpreadsheetMetadataTool,
  getValuesTool,
  batchGetValuesTool,
  updateValuesTool,
  appendValuesTool,
  batchUpdateValuesTool,
  clearValuesTool,
  batchClearValuesTool,
  createSpreadsheetTool,
  addSheetTool,
  deleteSheetTool,
  duplicateSheetTool,
  renameSheetTool,
  insertRowsTool,
  insertColumnsTool,
  deleteRowsTool,
  deleteColumnsTool,
  formatCellsTool,
  findRowByValueTool,
  getLastRowIndexTool,
  getSheetByNameTool,
} from "../tools/sheets";
export const sheetsReaderAgent = new Agent({
  name: "sheets-reader-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Sheets Reader.
- Read spreadsheet metadata and values.
- Use get_spreadsheet, get_spreadsheet_metadata, get_values, batch_get_values.
- For view-then-modify requests, read first and return a short summary.
Keep outputs short and return structured results when possible.`,
  tools: [
    getSpreadsheetTool,
    getSpreadsheetMetadataTool,
    getValuesTool,
    batchGetValuesTool,
    findRowByValueTool,
    getLastRowIndexTool,
    getSheetByNameTool,
  ],
});

export const sheetsWriterAgent = new Agent({
  name: "sheets-writer-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Sheets Writer.
- Update/append/batch-update spreadsheet values.
- Use update_values, append_values, batch_update_values.
Return a brief summary of rows/cells changed.`,
  tools: [updateValuesTool, appendValuesTool, batchUpdateValuesTool],
});

export const sheetsManagementAgent = new Agent({
  name: "sheets-management-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Sheets Management agent.
- Create spreadsheets, add/delete/duplicate/rename sheets.
- Use create_spreadsheet, add_sheet, delete_sheet, duplicate_sheet, rename_sheet.
Return created IDs/URLs or confirmation messages.`,
  tools: [
    createSpreadsheetTool,
    addSheetTool,
    deleteSheetTool,
    duplicateSheetTool,
    renameSheetTool,
  ],
});

export const sheetsStructureAgent = new Agent({
  name: "sheets-structure-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Sheets Structure agent.
- Insert/delete rows & columns.
- Use insert_rows, insert_columns, delete_rows, delete_columns.
Return summary of affected ranges.`,
  tools: [insertRowsTool, insertColumnsTool, deleteRowsTool, deleteColumnsTool],
});

export const sheetsFormattingAgent = new Agent({
  name: "sheets-formatting-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Sheets Formatting agent.
- Apply formatting to ranges (colors, font, alignment).
- Use format_cells.
- Describe what will change and confirm for broad style changes.
Return a short success message.`,
  tools: [formatCellsTool],
});

export const sheetsHelperAgent = new Agent({
  name: "sheets-helper-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Sheets Helper.
- Utility helpers: find row index, get last row index, get sheet by name.
- Use find_row_by_value, get_last_row_index, get_sheet_by_name.
Return concise results for downstream agents.`,
  tools: [findRowByValueTool, getLastRowIndexTool, getSheetByNameTool],
});


