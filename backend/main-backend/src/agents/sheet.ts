import { tool, RunContext, Agent } from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import { z } from "zod";
import { SheetsService } from "../utils/google/sheet";

// ------------------------------------------------------------------
// Interfaces & Helpers
// ------------------------------------------------------------------

export interface Tokens {
  service: string;
  refreshToken: string;
}

function getRefreshToken(tokens: Tokens[]) {
  const res = tokens.filter((token) => token.service === "sheets");
  if (res.length <= 0) {
    throw new Error("no refresh token of the sheets found");
  }
  return res[0].refreshToken;
}

// ------------------------------------------------------------------
// Read Operations
// ------------------------------------------------------------------

export const getSpreadsheetTool = tool({
  name: "get_spreadsheet",
  description:
    "Get complete spreadsheet information including all sheets and their properties.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
  }),
  execute: async ({ spreadsheetId }, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the sheets found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const sheets = new SheetsService(refreshToken);
      const result = await sheets.getSpreadsheet(spreadsheetId);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error("Error getting spreadsheet:", error);
      return {
        success: false,
        error: error?.message || "Failed to get spreadsheet",
        details: error?.stack,
      };
    }
  },
});

export const getSpreadsheetMetadataTool = tool({
  name: "get_spreadsheet_metadata",
  description:
    "Get spreadsheet metadata (title, sheets list) without cell data. Faster than getting full spreadsheet.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
  }),
  execute: async ({ spreadsheetId }, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the sheets found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const sheets = new SheetsService(refreshToken);
      const result = await sheets.getSpreadsheetMetadata(spreadsheetId);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error("Error getting spreadsheet metadata:", error);
      return {
        success: false,
        error: error?.message || "Failed to get spreadsheet metadata",
        details: error?.stack,
      };
    }
  },
});

export const getValuesTool = tool({
  name: "get_values",
  description: `
Get values from a specific range in a spreadsheet.
Range format: 'Sheet1!A1:D10' or 'Sheet1' for entire sheet.
Parameters:
- spreadsheetId: The spreadsheet ID (required)
- range: A1 notation range like 'Sheet1!A1:D10' (required)
- majorDimension: 'ROWS' or 'COLUMNS' (default: 'ROWS')
- valueRenderOption: 'FORMATTED_VALUE', 'UNFORMATTED_VALUE', or 'FORMULA' (default: 'FORMATTED_VALUE')
  `,
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    range: z.string().describe("A1 notation range (e.g., 'Sheet1!A1:D10')"),
    majorDimension: z
      .enum(["ROWS", "COLUMNS"])
      .default("ROWS")
      .describe("How to organize the data"),
    valueRenderOption: z
      .enum(["FORMATTED_VALUE", "UNFORMATTED_VALUE", "FORMULA"])
      .default("FORMATTED_VALUE")
      .describe("How to render values"),
  }),
  execute: async (
    { spreadsheetId, range, majorDimension, valueRenderOption },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the sheets found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const sheets = new SheetsService(refreshToken);
      const result = await sheets.getValues({
        spreadsheetId,
        range,
        majorDimension,
        valueRenderOption,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error("Error getting values:", error);
      return {
        success: false,
        error: error?.message || "Failed to get values",
        details: error?.stack,
      };
    }
  },
});

export const batchGetValuesTool = tool({
  name: "batch_get_values",
  description:
    "Get values from multiple ranges at once. More efficient than multiple individual requests.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    ranges: z
      .array(z.string())
      .describe(
        "Array of A1 notation ranges (e.g., ['Sheet1!A1:D10', 'Sheet2!B2:C5'])"
      ),
    majorDimension: z
      .enum(["ROWS", "COLUMNS"])
      .default("ROWS")
      .describe("How to organize the data"),
    valueRenderOption: z
      .enum(["FORMATTED_VALUE", "UNFORMATTED_VALUE", "FORMULA"])
      .default("FORMATTED_VALUE")
      .describe("How to render values"),
  }),
  execute: async (
    { spreadsheetId, ranges, majorDimension, valueRenderOption },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the sheets found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const sheets = new SheetsService(refreshToken);
      const result = await sheets.batchGetValues({
        spreadsheetId,
        ranges,
        majorDimension,
        valueRenderOption,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error("Error batch getting values:", error);
      return {
        success: false,
        error: error?.message || "Failed to batch get values",
        details: error?.stack,
      };
    }
  },
});

export const findRowByValueTool = tool({
  name: "find_row_by_value",
  description: "Find the row index of a specific value in a column.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    range: z.string().describe("Range to search (e.g., 'Sheet1!A1:Z100')"),
    columnIndex: z.number().describe("Column index to search (0-based)"),
    value: z
      .union([z.string(), z.number(), z.boolean()])
      .describe("Value to search for"),
  }),
  execute: async (
    { spreadsheetId, range, columnIndex, value },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the sheets found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const sheets = new SheetsService(refreshToken);
      const rowIndex = await sheets.findRowByValue({
        spreadsheetId,
        range,
        columnIndex,
        value,
      });

      if (rowIndex === null) {
        return {
          success: true,
          message: `Value '${value}' not found in column ${columnIndex}`,
          data: { rowIndex: null },
        };
      }

      return {
        success: true,
        message: `Found value '${value}' at row index ${rowIndex}`,
        data: { rowIndex },
      };
    } catch (error: any) {
      console.error("Error finding row:", error);
      return {
        success: false,
        error: error?.message || "Failed to find row",
        details: error?.stack,
      };
    }
  },
});

export const getLastRowIndexTool = tool({
  name: "get_last_row_index",
  description: "Get the index of the last non-empty row in a range.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    range: z.string().describe("Range to check (e.g., 'Sheet1!A:A')"),
  }),
  execute: async (
    { spreadsheetId, range },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the sheets found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const sheets = new SheetsService(refreshToken);
      const lastRowIndex = await sheets.getLastRowIndex(spreadsheetId, range);

      return {
        success: true,
        message: `Last row index is ${lastRowIndex}`,
        data: { lastRowIndex },
      };
    } catch (error: any) {
      console.error("Error getting last row index:", error);
      return {
        success: false,
        error: error?.message || "Failed to get last row index",
        details: error?.stack,
      };
    }
  },
});

export const getSheetByNameTool = tool({
  name: "get_sheet_by_name",
  description: "Get sheet information by sheet name/title.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    sheetName: z.string().describe("Name of the sheet to find"),
  }),
  execute: async (
    { spreadsheetId, sheetName },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("no refresh token of the sheets found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const sheets = new SheetsService(refreshToken);
      const sheet = await sheets.getSheetByName(spreadsheetId, sheetName);

      return {
        success: true,
        message: `Found sheet: ${sheetName}`,
        data: sheet,
      };
    } catch (error: any) {
      console.error("Error getting sheet by name:", error);
      return {
        success: false,
        error: error?.message || "Failed to get sheet by name",
        details: error?.stack,
      };
    }
  },
});

// ------------------------------------------------------------------
// Agent Definition
// ------------------------------------------------------------------

export const sheetsAgent = new Agent({
  name: "sheets-agent",
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
You are the Google Sheets agent for reading spreadsheet data.

CAPABILITIES:

Reading Operations:
- Get spreadsheet information and metadata
- Read values from single or multiple ranges
- Search for specific values in sheets
- Find row indices and last row positions
- Get sheet information by name

BEST PRACTICES:

1. Use batch operations when reading multiple ranges for efficiency
2. Use metadata endpoints when you don't need cell data
3. Always use clear ranges in A1 notation (e.g., 'Sheet1!A1:D10')
4. Present data in a clear, organized format

VALUE RENDER OPTIONS:
- FORMATTED_VALUE: Human-readable format (default)
- UNFORMATTED_VALUE: Raw values
- FORMULA: Show formulas instead of results
  `,
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

export default sheetsAgent;
