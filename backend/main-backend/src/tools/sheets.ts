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
  // console.log(tokens);
  const res = tokens.filter((token) => token.service === "sheets");
  if (res.length <= 0) {
    throw new Error("no refresh token of the sheets found");
  }
  return res[0].refreshToken;
}

// Shared schema for cell values to prevent Zod validation crashes
const cellValueSchema = z
  .any()
  .describe("The cell value (string, number, boolean, etc.)");

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

// ------------------------------------------------------------------
// Write Operations
// ------------------------------------------------------------------

export const updateValuesTool = tool({
  name: "update_values",
  description: `
Update values in a specific range. Overwrites existing data.
Range format: 'Sheet1!A1:D10'
Values format: 2D array like [['A1', 'B1'], ['A2', 'B2']]
  `,
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    range: z.string().describe("A1 notation range (e.g., 'Sheet1!A1:D10')"),
    // Using z.any() here to handle various data types safely without throwing 400
    values: z
      .array(z.array(cellValueSchema))
      .describe("2D array of values to write"),
    valueInputOption: z
      .enum(["RAW", "USER_ENTERED"])
      .default("USER_ENTERED")
      .describe(
        "RAW for literal values, USER_ENTERED to parse formulas (default: USER_ENTERED)"
      ),
  }),
  execute: async (
    { spreadsheetId, range, values, valueInputOption },
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
      const result = await sheets.updateValues({
        spreadsheetId,
        range,
        values,
        valueInputOption,
      });

      return {
        success: true,
        message: `Successfully updated ${result.updatedCells} cells in range ${result.updatedRange}`,
        data: result,
      };
    } catch (error: any) {
      console.error("Error updating values:", error);
      return {
        success: false,
        error: error?.message || "Failed to update values",
        details: error?.stack,
      };
    }
  },
});

export const appendValuesTool = tool({
  name: "append_values",
  description: `
Append rows to the end of a sheet. Automatically finds the last row and appends after it.
Range format: 'Sheet1!A1' or 'Sheet1' (starting column)
Values format: 2D array like [['A', 'B', 'C'], ['D', 'E', 'F']]
  `,
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    range: z
      .string()
      .describe("Starting range (e.g., 'Sheet1!A1' or 'Sheet1')"),
    values: z
      .array(z.array(cellValueSchema))
      .describe("2D array of values to append"),
    valueInputOption: z
      .enum(["RAW", "USER_ENTERED"])
      .default("USER_ENTERED")
      .describe(
        "RAW for literal values, USER_ENTERED to parse formulas (default: USER_ENTERED)"
      ),
    insertDataOption: z
      .enum(["OVERWRITE", "INSERT_ROWS"])
      .default("INSERT_ROWS")
      .describe(
        "OVERWRITE to replace, INSERT_ROWS to add new rows (default: INSERT_ROWS)"
      ),
  }),
  execute: async (
    { spreadsheetId, range, values, valueInputOption, insertDataOption },
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
      const result = await sheets.appendValues({
        spreadsheetId,
        range,
        values,
        valueInputOption,
        insertDataOption,
      });

      return {
        success: true,
        message: `Successfully appended ${result.updates?.updatedRows} rows`,
        data: result,
      };
    } catch (error: any) {
      console.error("Error appending values:", error);
      return {
        success: false,
        error: error?.message || "Failed to append values",
        details: error?.stack,
      };
    }
  },
});

export const batchUpdateValuesTool = tool({
  name: "batch_update_values",
  description:
    "Update multiple ranges at once. More efficient than individual updates.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    data: z
      .array(
        z.object({
          range: z.string(),
          values: z.array(z.array(cellValueSchema)),
        })
      )
      .describe("Array of range/values pairs"),
    valueInputOption: z
      .enum(["RAW", "USER_ENTERED"])
      .default("USER_ENTERED")
      .describe(
        "RAW for literal values, USER_ENTERED to parse formulas (default: USER_ENTERED)"
      ),
  }),
  execute: async (
    { spreadsheetId, data, valueInputOption },
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
      const result = await sheets.batchUpdateValues({
        spreadsheetId,
        data,
        valueInputOption,
      });

      return {
        success: true,
        message: `Successfully updated ${result.totalUpdatedCells} cells across ${result.totalUpdatedRows} rows`,
        data: result,
      };
    } catch (error: any) {
      console.error("Error batch updating values:", error);
      return {
        success: false,
        error: error?.message || "Failed to batch update values",
        details: error?.stack,
      };
    }
  },
});

export const clearValuesTool = tool({
  name: "clear_values",
  description:
    "Clear values from a range. Keeps formatting but removes all data.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    range: z
      .string()
      .describe("A1 notation range to clear (e.g., 'Sheet1!A1:D10')"),
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
      const result = await sheets.clearValues({
        spreadsheetId,
        range,
      });

      return {
        success: true,
        message: `Successfully cleared range ${result.clearedRange}`,
        data: result,
      };
    } catch (error: any) {
      console.error("Error clearing values:", error);
      return {
        success: false,
        error: error?.message || "Failed to clear values",
        details: error?.stack,
      };
    }
  },
});

export const batchClearValuesTool = tool({
  name: "batch_clear_values",
  description: "Clear values from multiple ranges at once.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    ranges: z
      .array(z.string())
      .describe("Array of A1 notation ranges to clear"),
  }),
  execute: async (
    { spreadsheetId, ranges },
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
      const result = await sheets.batchClearValues({
        spreadsheetId,
        ranges,
      });

      return {
        success: true,
        message: `Successfully cleared ${ranges.length} ranges`,
        data: result,
      };
    } catch (error: any) {
      console.error("Error batch clearing values:", error);
      return {
        success: false,
        error: error?.message || "Failed to batch clear values",
        details: error?.stack,
      };
    }
  },
});

// ------------------------------------------------------------------
// Sheet Management
// ------------------------------------------------------------------

export const createSpreadsheetTool = tool({
  name: "create_spreadsheet",
  description: `
Create a new spreadsheet with optional sheets configuration.
Returns the spreadsheet ID and URL.
  `,
  parameters: z.object({
    title: z.string().describe("Title of the new spreadsheet"),
    sheets: z
      .array(
        z.object({
          title: z.string(),
          rowCount: z.number().default(1000),
          columnCount: z.number().default(26),
        })
      )
      .default([])
      .describe("Optional array of sheets to create"),
  }),
  execute: async ({ title, sheets }, runContext?: RunContext<Tokens[]>) => {
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

      const sheetsService = new SheetsService(refreshToken);
      const result = await sheetsService.createSpreadsheet({
        title,
        sheets:
          sheets.length > 0
            ? sheets.map((s) => ({
                title: s.title,
                gridProperties: {
                  rowCount: s.rowCount,
                  columnCount: s.columnCount,
                },
              }))
            : undefined,
      });

      return {
        success: true,
        message: `Successfully created spreadsheet: ${title}`,
        data: {
          spreadsheetId: result.spreadsheetId,
          spreadsheetUrl: result.spreadsheetUrl,
          properties: result.properties,
        },
      };
    } catch (error: any) {
      console.error("Error creating spreadsheet:", error);
      return {
        success: false,
        error: error?.message || "Failed to create spreadsheet",
        details: error?.stack,
      };
    }
  },
});

export const addSheetTool = tool({
  name: "add_sheet",
  description: "Add a new sheet (tab) to an existing spreadsheet.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    title: z.string().describe("Title of the new sheet"),
    rowCount: z
      .number()
      .default(1000)
      .describe("Number of rows (default: 1000)"),
    columnCount: z
      .number()
      .default(26)
      .describe("Number of columns (default: 26)"),
    index: z.number().default(0).describe("Position index (0-based)"),
  }),
  execute: async (
    { spreadsheetId, title, rowCount, columnCount, index },
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
      const result = await sheets.addSheet({
        spreadsheetId,
        title,
        rowCount,
        columnCount,
        index,
      });

      return {
        success: true,
        message: `Successfully added sheet: ${title}`,
        data: result,
      };
    } catch (error: any) {
      console.error("Error adding sheet:", error);
      return {
        success: false,
        error: error?.message || "Failed to add sheet",
        details: error?.stack,
      };
    }
  },
});

export const deleteSheetTool = tool({
  name: "delete_sheet",
  description:
    "Delete a sheet (tab) from a spreadsheet. This action cannot be undone.",
  needsApproval: true,
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    sheetId: z.number().describe("The sheet ID (not the title)"),
  }),
  execute: async (
    { spreadsheetId, sheetId },
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
      await sheets.deleteSheet(spreadsheetId, sheetId);

      return {
        success: true,
        message: "Sheet deleted successfully",
      };
    } catch (error: any) {
      console.error("Error deleting sheet:", error);
      return {
        success: false,
        error: error?.message || "Failed to delete sheet",
        details: error?.stack,
      };
    }
  },
});

export const duplicateSheetTool = tool({
  name: "duplicate_sheet",
  description:
    "Create a copy of an existing sheet within the same spreadsheet.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    sourceSheetId: z.number().describe("The sheet ID to duplicate"),
    newSheetName: z
      .string()
      .default("")
      .describe("Name for the duplicated sheet"),
    insertSheetIndex: z
      .number()
      .default(0)
      .describe("Position for the new sheet"),
  }),
  execute: async (
    { spreadsheetId, sourceSheetId, newSheetName, insertSheetIndex },
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
      const result = await sheets.duplicateSheet({
        spreadsheetId,
        sourceSheetId,
        newSheetName: newSheetName || undefined,
        insertSheetIndex,
      });

      return {
        success: true,
        message: `Successfully duplicated sheet${
          newSheetName ? ` as '${newSheetName}'` : ""
        }`,
        data: result,
      };
    } catch (error: any) {
      console.error("Error duplicating sheet:", error);
      return {
        success: false,
        error: error?.message || "Failed to duplicate sheet",
        details: error?.stack,
      };
    }
  },
});

export const renameSheetTool = tool({
  name: "rename_sheet",
  description: "Rename an existing sheet (tab) in a spreadsheet.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    sheetId: z.number().describe("The sheet ID to rename"),
    newTitle: z.string().describe("New name for the sheet"),
  }),
  execute: async (
    { spreadsheetId, sheetId, newTitle },
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
      await sheets.renameSheet(spreadsheetId, sheetId, newTitle);

      return {
        success: true,
        message: `Successfully renamed sheet to '${newTitle}'`,
      };
    } catch (error: any) {
      console.error("Error renaming sheet:", error);
      return {
        success: false,
        error: error?.message || "Failed to rename sheet",
        details: error?.stack,
      };
    }
  },
});

// ------------------------------------------------------------------
// Row/Column Operations
// ------------------------------------------------------------------

export const insertRowsTool = tool({
  name: "insert_rows",
  description: "Insert empty rows into a sheet.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    sheetId: z.number().describe("The sheet ID"),
    startIndex: z.number().describe("Starting row index (0-based)"),
    endIndex: z.number().describe("Ending row index (exclusive)"),
  }),
  execute: async (
    { spreadsheetId, sheetId, startIndex, endIndex },
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
      await sheets.insertRows({
        spreadsheetId,
        sheetId,
        startIndex,
        endIndex,
      });

      return {
        success: true,
        message: `Successfully inserted ${
          endIndex - startIndex
        } rows at index ${startIndex}`,
      };
    } catch (error: any) {
      console.error("Error inserting rows:", error);
      return {
        success: false,
        error: error?.message || "Failed to insert rows",
        details: error?.stack,
      };
    }
  },
});

export const insertColumnsTool = tool({
  name: "insert_columns",
  description: "Insert empty columns into a sheet.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    sheetId: z.number().describe("The sheet ID"),
    startIndex: z.number().describe("Starting column index (0-based)"),
    endIndex: z.number().describe("Ending column index (exclusive)"),
  }),
  execute: async (
    { spreadsheetId, sheetId, startIndex, endIndex },
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
      await sheets.insertColumns({
        spreadsheetId,
        sheetId,
        startIndex,
        endIndex,
      });

      return {
        success: true,
        message: `Successfully inserted ${
          endIndex - startIndex
        } columns at index ${startIndex}`,
      };
    } catch (error: any) {
      console.error("Error inserting columns:", error);
      return {
        success: false,
        error: error?.message || "Failed to insert columns",
        details: error?.stack,
      };
    }
  },
});

export const deleteRowsTool = tool({
  name: "delete_rows",
  description: "Delete rows from a sheet. This action cannot be undone.",
  needsApproval: true,
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    sheetId: z.number().describe("The sheet ID"),
    startIndex: z.number().describe("Starting row index (0-based)"),
    endIndex: z.number().describe("Ending row index (exclusive)"),
  }),
  execute: async (
    { spreadsheetId, sheetId, startIndex, endIndex },
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
      await sheets.deleteRows({
        spreadsheetId,
        sheetId,
        startIndex,
        endIndex,
      });

      return {
        success: true,
        message: `Successfully deleted ${
          endIndex - startIndex
        } rows from index ${startIndex}`,
      };
    } catch (error: any) {
      console.error("Error deleting rows:", error);
      return {
        success: false,
        error: error?.message || "Failed to delete rows",
        details: error?.stack,
      };
    }
  },
});

export const deleteColumnsTool = tool({
  name: "delete_columns",
  description: "Delete columns from a sheet. This action cannot be undone.",
  needsApproval: true,
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    sheetId: z.number().describe("The sheet ID"),
    startIndex: z.number().describe("Starting column index (0-based)"),
    endIndex: z.number().describe("Ending column index (exclusive)"),
  }),
  execute: async (
    { spreadsheetId, sheetId, startIndex, endIndex },
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
      await sheets.deleteColumns({
        spreadsheetId,
        sheetId,
        startIndex,
        endIndex,
      });

      return {
        success: true,
        message: `Successfully deleted ${
          endIndex - startIndex
        } columns from index ${startIndex}`,
      };
    } catch (error: any) {
      console.error("Error deleting columns:", error);
      return {
        success: false,
        error: error?.message || "Failed to delete columns",
        details: error?.stack,
      };
    }
  },
});

// ------------------------------------------------------------------
// Formatting
// ------------------------------------------------------------------

export const formatCellsTool = tool({
  name: "format_cells",
  description:
    "Apply formatting to a range of cells (colors, text style, alignment).",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    sheetId: z.number().describe("The sheet ID"),
    startRowIndex: z.number().describe("Starting row index (0-based)"),
    endRowIndex: z.number().describe("Ending row index (exclusive)"),
    startColumnIndex: z.number().describe("Starting column index (0-based)"),
    endColumnIndex: z.number().describe("Ending column index (exclusive)"),
    backgroundColor: z
      .object({
        red: z.number().min(0).max(1),
        green: z.number().min(0).max(1),
        blue: z.number().min(0).max(1),
      })
      .optional()
      .describe("Background color (RGB values 0-1)"),
    bold: z.boolean().optional().describe("Make text bold"),
    italic: z.boolean().optional().describe("Make text italic"),
    fontSize: z.number().optional().describe("Font size in points"),
    textColor: z
      .object({
        red: z.number().min(0).max(1),
        green: z.number().min(0).max(1),
        blue: z.number().min(0).max(1),
      })
      .optional()
      .describe("Text color (RGB values 0-1)"),
    horizontalAlignment: z
      .enum(["LEFT", "CENTER", "RIGHT"])
      .optional()
      .describe("Horizontal alignment"),
    verticalAlignment: z
      .enum(["TOP", "MIDDLE", "BOTTOM"])
      .optional()
      .describe("Vertical alignment"),
  }),
  execute: async (
    {
      spreadsheetId,
      sheetId,
      startRowIndex,
      endRowIndex,
      startColumnIndex,
      endColumnIndex,
      backgroundColor,
      bold,
      italic,
      fontSize,
      textColor,
      horizontalAlignment,
      verticalAlignment,
    },
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

      const format: any = {};

      if (backgroundColor) {
        format.backgroundColor = backgroundColor;
      }

      if (
        bold !== undefined ||
        italic !== undefined ||
        fontSize !== undefined ||
        textColor !== undefined
      ) {
        format.textFormat = {};
        if (bold !== undefined) format.textFormat.bold = bold;
        if (italic !== undefined) format.textFormat.italic = italic;
        if (fontSize !== undefined) format.textFormat.fontSize = fontSize;
        if (textColor) format.textFormat.foregroundColor = textColor;
      }

      if (horizontalAlignment) {
        format.horizontalAlignment = horizontalAlignment;
      }

      if (verticalAlignment) {
        format.verticalAlignment = verticalAlignment;
      }

      await sheets.formatCells({
        spreadsheetId,
        sheetId,
        startRowIndex,
        endRowIndex,
        startColumnIndex,
        endColumnIndex,
        format,
      });

      return {
        success: true,
        message: `Successfully formatted cells from row ${startRowIndex} to ${endRowIndex}, column ${startColumnIndex} to ${endColumnIndex}`,
      };
    } catch (error: any) {
      console.error("Error formatting cells:", error);
      return {
        success: false,
        error: error?.message || "Failed to format cells",
        details: error?.stack,
      };
    }
  },
});

// ------------------------------------------------------------------
// Helper Tools
// ------------------------------------------------------------------

export const findRowByValueTool = tool({
  name: "find_row_by_value",
  description: "Find the row index of a specific value in a column.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID"),
    range: z.string().describe("Range to search (e.g., 'Sheet1!A1:Z100')"),
    columnIndex: z.number().describe("Column index to search (0-based)"),
    // Fixed: Using cellValueSchema instead of z.any() directly for consistency
    value: cellValueSchema,
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
You are the Google Sheets agent for reading and writing spreadsheet data.

CAPABILITIES:

Reading Operations:
- Get spreadsheet information and metadata
- Read values from single or multiple ranges
- Search for specific values in sheets
- Find row indices and last row positions
- Get sheet information by name

Writing Operations:
- Update cell values in existing ranges
- Append new rows to sheets
- Batch update multiple ranges at once
- Clear values from ranges (preserves formatting)
- Handle both RAW and USER_ENTERED input modes

WORKFLOW BEST PRACTICES:

1. For view-then-modify requests:
   - First read/search to show current data
   - Present results to user
   - Then perform the requested modifications

2. Before large operations:
   - For CLEAR operations affecting >50 cells: Ask for confirmation
   - Present clear summary of what will be modified

3. After major changes:
   - Offer to read back the data for verification
   - Provide a clear summary of what was changed

INPUT MODES:
- USER_ENTERED: Parse formulas, dates, numbers (default, recommended)
- RAW: Store values exactly as provided (use for pre-formatted data)

IMPORTANT NOTES:
- Always use clear ranges in A1 notation (e.g., 'Sheet1!A1:D10')
- Use batch operations when working with multiple ranges for efficiency
- Present clear summaries before and after operations
- Clearing removes DATA only, not formatting or structure
  `,
  tools: [
    // Reading tools
    getSpreadsheetTool,
    getSpreadsheetMetadataTool,
    getValuesTool,
    batchGetValuesTool,
    findRowByValueTool,
    getLastRowIndexTool,
    getSheetByNameTool,
    // Writing tools
    updateValuesTool,
    appendValuesTool,
    batchUpdateValuesTool,
    // Clearing tools
    clearValuesTool,
    batchClearValuesTool,
    // Management tools
    createSpreadsheetTool,
    addSheetTool,
    deleteSheetTool,
    duplicateSheetTool,
    renameSheetTool,
    // Row/Column operations
    insertRowsTool,
    insertColumnsTool,
    deleteRowsTool,
    deleteColumnsTool,
    // Formatting
    formatCellsTool,
  ],
});

export default sheetsAgent;
