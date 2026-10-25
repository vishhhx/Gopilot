import { tool, RunContext, Agent } from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import { z } from "zod";
import { SheetsService } from "../utils/google/sheet";

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

function handleApiError(error: any) {
  console.error("API Error:", error);

  if (error.code === 400) {
    return {
      success: false,
      error:
        "Invalid request parameters. Check your input data and range format.",
      details: error.message,
    };
  } else if (error.code === 403) {
    return {
      success: false,
      error:
        "Permission denied. Check spreadsheet sharing settings and API permissions.",
      details: error.message,
    };
  } else if (error.code === 404) {
    return {
      success: false,
      error:
        "Spreadsheet, sheet, or range not found. Verify the IDs and ranges.",
      details: error.message,
    };
  } else if (error.code === 429) {
    return {
      success: false,
      error: "Rate limit exceeded. Please try again later.",
      details: error.message,
    };
  }

  return {
    success: false,
    error: error?.message || "An unexpected error occurred",
    details: error?.stack,
  };
}

// Shared schema for cell values to prevent Zod validation crashes
const primitive = z.union([z.string(), z.number(), z.boolean(), z.null()]);

// Array of primitives: items are explicit (no z.any())
const primitiveArray = z.array(primitive);

// 2D array (optional) — items are arrays of primitives
const primitive2DArray = z.array(primitiveArray);

// Simple object with primitive values (keys are strings, values are primitives)
const simpleObject = z.record(primitive);

// Object whose values are arrays of primitives (e.g., { "col": ["a","b"] })
const objectOfPrimitiveArrays = z.record(primitiveArray);

// Final union: includes only concrete typed branches
export const cellValueSchema = z
  .union([
    primitive, // string|number|boolean|null
    primitiveArray, // ["a","b", ...]
    primitive2DArray, // [["a","b"], ["c","d"]] — if you might store small arrays
    simpleObject, // {"k": "v"}
    objectOfPrimitiveArrays, // {"k": ["v1","v2"]}
  ])
  .describe(
    "A spreadsheet cell value: primitive (string|number|boolean|null), array of primitives, 2D-array of primitives, or object with primitive/primitive-array values"
  );
export const getSpreadsheetTool = tool({
  name: "get_spreadsheet",
  description:
    "Get complete spreadsheet information including all sheets and their properties. Use this to understand the structure of a spreadsheet.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
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
      return handleApiError(error);
    }
  },
});

export const getSpreadsheetMetadataTool = tool({
  name: "get_spreadsheet_metadata",
  description:
    "Get spreadsheet metadata (title, sheets list) without cell data. Faster than getting full spreadsheet. Use this when you only need to see what sheets exist.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
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
      return handleApiError(error);
    }
  },
});

export const getValuesTool = tool({
  name: "get_values",
  description: `
Get values from a specific range in a spreadsheet.

Range formats:
- 'Sheet1!A1:D10' - Specific range
- 'Sheet1!A:A' - Entire column A
- 'Sheet1!1:1' - Entire row 1
- 'Sheet1' - Entire sheet

Parameters:
- spreadsheetId: The spreadsheet ID (required)
- range: A1 notation range (required)
- majorDimension: How to organize data (default: 'ROWS')
  - 'ROWS': Returns [[row1], [row2], ...]
  - 'COLUMNS': Returns [[col1], [col2], ...]
- valueRenderOption: How to render values (default: 'FORMATTED_VALUE')
  - 'FORMATTED_VALUE': Values as they appear in the UI (e.g., "$1,000")
  - 'UNFORMATTED_VALUE': Raw values (e.g., 1000)
  - 'FORMULA': Cell formulas (e.g., "=SUM(A1:A10)")
  `,
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
    range: z.string().describe("A1 notation range (e.g., 'Sheet1!A1:D10')"),
    majorDimension: z
      .enum(["ROWS", "COLUMNS"])
      .default("ROWS")
      .describe("How to organize the data (default: ROWS)"),
    valueRenderOption: z
      .enum(["FORMATTED_VALUE", "UNFORMATTED_VALUE", "FORMULA"])
      .default("FORMATTED_VALUE")
      .describe("How to render values (default: FORMATTED_VALUE)"),
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
        rowCount: result.values?.length || 0,
      };
    } catch (error: any) {
      return handleApiError(error);
    }
  },
});

export const batchGetValuesTool = tool({
  name: "batch_get_values",
  description:
    "Get values from multiple ranges at once. More efficient than multiple individual requests. Use when you need data from different parts of the spreadsheet.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
    ranges: z
      .array(z.string())
      .describe(
        "Array of A1 notation ranges (e.g., ['Sheet1!A1:D10', 'Sheet2!B2:C5'])"
      ),
    majorDimension: z
      .enum(["ROWS", "COLUMNS"])
      .default("ROWS")
      .describe("How to organize the data (default: ROWS)"),
    valueRenderOption: z
      .enum(["FORMATTED_VALUE", "UNFORMATTED_VALUE", "FORMULA"])
      .default("FORMATTED_VALUE")
      .describe("How to render values (default: FORMATTED_VALUE)"),
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
        rangeCount: result.valueRanges?.length || 0,
      };
    } catch (error: any) {
      return handleApiError(error);
    }
  },
});

// ------------------------------------------------------------------
// Write Operations
// ------------------------------------------------------------------

export const updateValuesTool = tool({
  name: "update_values",
  description: `
Update values in a specific range. Overwrites existing data in the range.

Range format: 'Sheet1!A1:D10'
Values format: 2D array like [['A1', 'B1'], ['A2', 'B2']]

valueInputOption:
- 'USER_ENTERED' (default): Parses input as if user typed it (formulas, dates, numbers)
  Example: '=SUM(A1:A10)' becomes a formula, '1/1/2024' becomes a date
- 'RAW': Stores exactly as provided, no parsing
  Example: '=SUM(A1:A10)' stored as text string

sanitize: Set to true to prevent formula injection by escaping formulas
  `,
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
    range: z.string().describe("A1 notation range (e.g., 'Sheet1!A1:D10')"),
    values: z
      .array(z.array(cellValueSchema))
      .describe("2D array of values to write"),
    valueInputOption: z
      .enum(["RAW", "USER_ENTERED"])
      .default("USER_ENTERED")
      .describe(
        "RAW for literal values, USER_ENTERED to parse formulas (default: USER_ENTERED)"
      ),
    sanitize: z
      .boolean()
      .default(false)
      .describe("Escape formulas to prevent injection (default: false)"),
  }),
  execute: async (
    { spreadsheetId, range, values, valueInputOption, sanitize },
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
        sanitize,
      });

      return {
        success: true,
        message: `Successfully updated ${result.updatedCells} cells in range ${result.updatedRange}`,
        data: result,
      };
    } catch (error: any) {
      return handleApiError(error);
    }
  },
});

export const appendValuesTool = tool({
  name: "append_values",
  description: `
Append rows to the end of a sheet. Automatically finds the last row with data and appends after it.

Range format: 
- 'Sheet1!A1' or 'Sheet1' - Starting column for append
- The API finds the last row automatically

Values format: 2D array like [['A', 'B', 'C'], ['D', 'E', 'F']]

insertDataOption:
- 'INSERT_ROWS' (default): Insert new rows for the data
- 'OVERWRITE': Overwrite existing data if present

Note: Empty rows in the middle of data are NOT considered the "last row"
  `,
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
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
    sanitize: z
      .boolean()
      .default(false)
      .describe("Escape formulas to prevent injection (default: false)"),
  }),
  execute: async (
    {
      spreadsheetId,
      range,
      values,
      valueInputOption,
      insertDataOption,
      sanitize,
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
      const result = await sheets.appendValues({
        spreadsheetId,
        range,
        values,
        valueInputOption,
        insertDataOption,
        sanitize,
      });

      return {
        success: true,
        message: `Successfully appended ${result.updates?.updatedRows} rows`,
        data: result,
      };
    } catch (error: any) {
      return handleApiError(error);
    }
  },
});

export const batchUpdateValuesTool = tool({
  name: "batch_update_values",
  description:
    "Update multiple ranges at once. More efficient than individual updates. Limited to 100 ranges per request.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
    data: z
      .array(
        z.object({
          range: z.string().describe("A1 notation range"),
          values: z
            .array(z.array(cellValueSchema))
            .describe("2D array of values"),
        })
      )
      .max(100)
      .describe("Array of range/values pairs (max 100)"),
    valueInputOption: z
      .enum(["RAW", "USER_ENTERED"])
      .default("USER_ENTERED")
      .describe(
        "RAW for literal values, USER_ENTERED to parse formulas (default: USER_ENTERED)"
      ),
    sanitize: z
      .boolean()
      .default(false)
      .describe("Escape formulas to prevent injection (default: false)"),
  }),
  execute: async (
    { spreadsheetId, data, valueInputOption, sanitize },
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
        sanitize,
      });

      return {
        success: true,
        message: `Successfully updated ${result.totalUpdatedCells} cells across ${result.totalUpdatedRows} rows in ${data.length} ranges`,
        data: result,
      };
    } catch (error: any) {
      return handleApiError(error);
    }
  },
});

export const clearValuesTool = tool({
  name: "clear_values",
  description:
    "Clear values from a range. Keeps formatting and structure but removes all data. Cannot be undone.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
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
      return handleApiError(error);
    }
  },
});

export const batchClearValuesTool = tool({
  name: "batch_clear_values",
  description:
    "Clear values from multiple ranges at once. More efficient than individual clear operations.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
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
      return handleApiError(error);
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

If no sheets are specified, a default "Sheet1" is created automatically.
  `,
  parameters: z.object({
    title: z.string().describe("Title of the new spreadsheet"),
    sheets: z
      .array(
        z.object({
          title: z.string().describe("Sheet name/title"),
          rowCount: z
            .number()
            .default(1000)
            .describe("Number of rows (default: 1000)"),
          columnCount: z
            .number()
            .default(26)
            .describe("Number of columns (default: 26)"),
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
      return handleApiError(error);
    }
  },
});

export const addSheetTool = tool({
  name: "add_sheet",
  description:
    "Add a new sheet (tab) to an existing spreadsheet. Index 0 means first position.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
    title: z.string().describe("Title of the new sheet"),
    rowCount: z
      .number()
      .default(1000)
      .describe("Number of rows (default: 1000)"),
    columnCount: z
      .number()
      .default(26)
      .describe("Number of columns (default: 26)"),
    index: z
      .number()
      .default(0)
      .describe("Position index, 0-based (default: 0)"),
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
      return handleApiError(error);
    }
  },
});

export const deleteSheetTool = tool({
  name: "delete_sheet",
  description:
    "Delete a sheet (tab) from a spreadsheet. This action cannot be undone. Note: Use sheetId (numeric), not sheet title.",
  needsApproval: true,
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
    sheetId: z
      .number()
      .describe(
        "The numeric sheet ID (not the title). Get this from get_spreadsheet or get_spreadsheet_metadata"
      ),
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
      return handleApiError(error);
    }
  },
});

export const duplicateSheetTool = tool({
  name: "duplicate_sheet",
  description:
    "Create a copy of an existing sheet within the same spreadsheet. All data and formatting is copied.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
    sourceSheetId: z.number().describe("The numeric sheet ID to duplicate"),
    newSheetName: z
      .string()
      .default("")
      .describe(
        "Name for the duplicated sheet (optional, auto-generated if not provided)"
      ),
    insertSheetIndex: z
      .number()
      .default(0)
      .describe("Position for the new sheet (default: 0)"),
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
      return handleApiError(error);
    }
  },
});

export const renameSheetTool = tool({
  name: "rename_sheet",
  description: "Rename an existing sheet (tab) in a spreadsheet.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
    sheetId: z.number().describe("The numeric sheet ID to rename"),
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
      return handleApiError(error);
    }
  },
});

// ------------------------------------------------------------------
// Row/Column Operations
// ------------------------------------------------------------------

export const insertRowsTool = tool({
  name: "insert_rows",
  description:
    "Insert empty rows into a sheet. Indices are 0-based (row 1 = index 0).",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
    sheetId: z.number().describe("The numeric sheet ID"),
    startIndex: z.number().describe("Starting row index (0-based, inclusive)"),
    endIndex: z.number().describe("Ending row index (0-based, exclusive)"),
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
      return handleApiError(error);
    }
  },
});

export const insertColumnsTool = tool({
  name: "insert_columns",
  description:
    "Insert empty columns into a sheet. Indices are 0-based (column A = index 0).",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
    sheetId: z.number().describe("The numeric sheet ID"),
    startIndex: z
      .number()
      .describe("Starting column index (0-based, inclusive)"),
    endIndex: z.number().describe("Ending column index (0-based, exclusive)"),
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
      return handleApiError(error);
    }
  },
});

export const deleteRowsTool = tool({
  name: "delete_rows",
  description:
    "Delete rows from a sheet. This action cannot be undone. Indices are 0-based.",
  needsApproval: true,
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
    sheetId: z.number().describe("The numeric sheet ID"),
    startIndex: z.number().describe("Starting row index (0-based, inclusive)"),
    endIndex: z.number().describe("Ending row index (0-based, exclusive)"),
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
      return handleApiError(error);
    }
  },
});

export const deleteColumnsTool = tool({
  name: "delete_columns",
  description:
    "Delete columns from a sheet. This action cannot be undone. Indices are 0-based.",
  needsApproval: true,
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
    sheetId: z.number().describe("The numeric sheet ID"),
    startIndex: z
      .number()
      .describe("Starting column index (0-based, inclusive)"),
    endIndex: z.number().describe("Ending column index (0-based, exclusive)"),
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
      return handleApiError(error);
    }
  },
});

// ------------------------------------------------------------------
// Formatting
// ------------------------------------------------------------------

export const formatCellsTool = tool({
  name: "format_cells",
  description: `
Apply formatting to a range of cells (colors, text style, alignment, number format).

Color values: RGB from 0 to 1 (not 0-255). Example: red=1, green=0, blue=0 for pure red.
Alpha channel: Optional transparency from 0 (transparent) to 1 (opaque).

Number format types:
- 'NUMBER': General numbers
- 'CURRENCY': Currency format
- 'PERCENT': Percentage
- 'DATE': Date format
- 'TIME': Time format
- 'DATE_TIME': Combined date and time
- 'SCIENTIFIC': Scientific notation

Pattern examples:
- "$#,##0.00" - Currency with 2 decimals
- "0.00%" - Percentage with 2 decimals
- "mm/dd/yyyy" - Date format
- "h:mm:ss AM/PM" - Time format
  `,
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
    sheetId: z.number().describe("The numeric sheet ID"),
    startRowIndex: z
      .number()
      .describe("Starting row index (0-based, inclusive)"),
    endRowIndex: z.number().describe("Ending row index (0-based, exclusive)"),
    startColumnIndex: z
      .number()
      .describe("Starting column index (0-based, inclusive)"),
    endColumnIndex: z
      .number()
      .describe("Ending column index (0-based, exclusive)"),
    backgroundColor: z
      .object({
        red: z.number().min(0).max(1).describe("Red 0-1"),
        green: z.number().min(0).max(1).describe("Green 0-1"),
        blue: z.number().min(0).max(1).describe("Blue 0-1"),
        alpha: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Alpha/transparency 0-1"),
      })
      .optional()
      .describe("Background color (RGB values 0-1)"),
    bold: z.boolean().optional().describe("Make text bold"),
    italic: z.boolean().optional().describe("Make text italic"),
    fontSize: z.number().optional().describe("Font size in points"),
    textColor: z
      .object({
        red: z.number().min(0).max(1).describe("Red 0-1"),
        green: z.number().min(0).max(1).describe("Green 0-1"),
        blue: z.number().min(0).max(1).describe("Blue 0-1"),
        alpha: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Alpha/transparency 0-1"),
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
    numberFormatType: z
      .string()
      .optional()
      .describe(
        "Number format type (e.g., 'NUMBER', 'CURRENCY', 'DATE', 'PERCENT')"
      ),
    numberFormatPattern: z
      .string()
      .optional()
      .describe("Number format pattern (e.g., '$#,##0.00', 'mm/dd/yyyy')"),
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
      numberFormatType,
      numberFormatPattern,
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

      if (numberFormatType || numberFormatPattern) {
        format.numberFormat = {};
        if (numberFormatType) format.numberFormat.type = numberFormatType;
        if (numberFormatPattern)
          format.numberFormat.pattern = numberFormatPattern;
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
      return handleApiError(error);
    }
  },
});

// ------------------------------------------------------------------
// Helper Tools
// ------------------------------------------------------------------

export const findRowByValueTool = tool({
  name: "find_row_by_value",
  description:
    "Find the row index (0-based) of a specific value in a column. Returns null if not found.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
    range: z.string().describe("Range to search (e.g., 'Sheet1!A1:Z100')"),
    columnIndex: z
      .number()
      .describe("Column index to search (0-based, A=0, B=1, etc.)"),
    value: cellValueSchema.describe("Value to search for"),
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
          data: { rowIndex: null, found: false },
        };
      }

      return {
        success: true,
        message: `Found value '${value}' at row index ${rowIndex}`,
        data: { rowIndex, found: true },
      };
    } catch (error: any) {
      return handleApiError(error);
    }
  },
});

export const getLastRowIndexTool = tool({
  name: "get_last_row_index",
  description:
    "Get the index (0-based) of the last non-empty row in a range. Useful for finding where to append data.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
    range: z
      .string()
      .describe("Range to check (e.g., 'Sheet1!A:A' for entire column A)"),
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
      return handleApiError(error);
    }
  },
});

export const getSheetByNameTool = tool({
  name: "get_sheet_by_name",
  description:
    "Get sheet information (including sheetId) by sheet name/title. Use this to get the sheetId needed for other operations.",
  parameters: z.object({
    spreadsheetId: z.string().describe("The spreadsheet ID from the URL"),
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
      return handleApiError(error);
    }
  },
});
