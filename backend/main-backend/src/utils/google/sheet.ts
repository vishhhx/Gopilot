import { google } from "googleapis";
import { ENV } from "../../config";
import { sheets_v4 } from "googleapis";

export class SheetsService {
  private oauth2Client;
  private sheets: sheets_v4.Sheets;

  constructor(refreshToken: string) {
    if (
      !ENV.GOOGLE_CLIENT_ID ||
      !ENV.GOOGLE_CLIENT_SECRET ||
      !ENV.GOOGLE_REDIRECT_URI
    ) {
      throw new Error(
        "Google API credentials are missing in environment variables."
      );
    }

    this.oauth2Client = new google.auth.OAuth2(
      ENV.GOOGLE_CLIENT_ID,
      ENV.GOOGLE_CLIENT_SECRET,
      ENV.GOOGLE_REDIRECT_URI
    );

    if (!refreshToken) {
      throw new Error("no required Credentials are provided");
    }

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    this.sheets = google.sheets({ version: "v4", auth: this.oauth2Client });
  }

  // Utils
  private columnToLetter(column: number): string {
    let letter = "";
    while (column > 0) {
      const mod = (column - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      column = Math.floor((column - mod) / 26);
    }
    return letter;
  }

  private letterToColumn(letter: string): number {
    let column = 0;
    for (let i = 0; i < letter.length; i++) {
      column = column * 26 + (letter.charCodeAt(i) - 64);
    }
    return column;
  }

  // Read Operations
  async getSpreadsheet(spreadsheetId: string) {
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId,
    });

    return response.data;
  }

  async getSpreadsheetMetadata(spreadsheetId: string) {
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId,
      fields: "spreadsheetId,properties,sheets(properties)",
    });

    return response.data;
  }

  async getValues(options: {
    spreadsheetId: string;
    range: string;
    majorDimension?: "ROWS" | "COLUMNS";
    valueRenderOption?: "FORMATTED_VALUE" | "UNFORMATTED_VALUE" | "FORMULA";
    dateTimeRenderOption?: "SERIAL_NUMBER" | "FORMATTED_STRING";
  }) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: options.spreadsheetId,
      range: options.range,
      majorDimension: options.majorDimension,
      valueRenderOption: options.valueRenderOption,
      dateTimeRenderOption: options.dateTimeRenderOption,
    });

    return response.data;
  }

  async batchGetValues(options: {
    spreadsheetId: string;
    ranges: string[];
    majorDimension?: "ROWS" | "COLUMNS";
    valueRenderOption?: "FORMATTED_VALUE" | "UNFORMATTED_VALUE" | "FORMULA";
    dateTimeRenderOption?: "SERIAL_NUMBER" | "FORMATTED_STRING";
  }) {
    const response = await this.sheets.spreadsheets.values.batchGet({
      spreadsheetId: options.spreadsheetId,
      ranges: options.ranges,
      majorDimension: options.majorDimension,
      valueRenderOption: options.valueRenderOption,
      dateTimeRenderOption: options.dateTimeRenderOption,
    });

    return response.data;
  }

  async getSheetByName(spreadsheetId: string, sheetName: string) {
    const spreadsheet = await this.getSpreadsheet(spreadsheetId);
    const sheet = spreadsheet.sheets?.find(
      (s) => s.properties?.title === sheetName
    );

    if (!sheet) {
      throw new Error(`Sheet with name "${sheetName}" not found`);
    }

    return sheet;
  }

  // Write Operations
  async updateValues(options: {
    spreadsheetId: string;
    range: string;
    values: any[][];
    valueInputOption?: "RAW" | "USER_ENTERED";
  }) {
    const response = await this.sheets.spreadsheets.values.update({
      spreadsheetId: options.spreadsheetId,
      range: options.range,
      valueInputOption: options.valueInputOption || "USER_ENTERED",
      requestBody: {
        values: options.values,
      },
    });

    return response.data;
  }

  async appendValues(options: {
    spreadsheetId: string;
    range: string;
    values: any[][];
    valueInputOption?: "RAW" | "USER_ENTERED";
    insertDataOption?: "OVERWRITE" | "INSERT_ROWS";
  }) {
    const response = await this.sheets.spreadsheets.values.append({
      spreadsheetId: options.spreadsheetId,
      range: options.range,
      valueInputOption: options.valueInputOption || "USER_ENTERED",
      insertDataOption: options.insertDataOption || "INSERT_ROWS",
      requestBody: {
        values: options.values,
      },
    });

    return response.data;
  }

  async batchUpdateValues(options: {
    spreadsheetId: string;
    data: Array<{
      range: string;
      values: any[][];
    }>;
    valueInputOption?: "RAW" | "USER_ENTERED";
  }) {
    const response = await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: options.spreadsheetId,
      requestBody: {
        valueInputOption: options.valueInputOption || "USER_ENTERED",
        data: options.data,
      },
    });

    return response.data;
  }

  async clearValues(options: { spreadsheetId: string; range: string }) {
    const response = await this.sheets.spreadsheets.values.clear({
      spreadsheetId: options.spreadsheetId,
      range: options.range,
    });

    return response.data;
  }

  async batchClearValues(options: { spreadsheetId: string; ranges: string[] }) {
    const response = await this.sheets.spreadsheets.values.batchClear({
      spreadsheetId: options.spreadsheetId,
      requestBody: {
        ranges: options.ranges,
      },
    });

    return response.data;
  }

  // Sheet Management
  async createSpreadsheet(options: {
    title: string;
    sheets?: Array<{
      title: string;
      gridProperties?: {
        rowCount?: number;
        columnCount?: number;
        frozenRowCount?: number;
        frozenColumnCount?: number;
      };
    }>;
  }) {
    const response = await this.sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: options.title,
        },
        sheets: options.sheets?.map((sheet) => ({
          properties: {
            title: sheet.title,
            gridProperties: sheet.gridProperties,
          },
        })),
      },
    });

    return response.data;
  }

  async addSheet(options: {
    spreadsheetId: string;
    title: string;
    rowCount?: number;
    columnCount?: number;
    index?: number;
  }) {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: options.spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: options.title,
                index: options.index,
                gridProperties: {
                  rowCount: options.rowCount || 1000,
                  columnCount: options.columnCount || 26,
                },
              },
            },
          },
        ],
      },
    });

    return response.data;
  }

  async deleteSheet(spreadsheetId: string, sheetId: number) {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteSheet: {
              sheetId,
            },
          },
        ],
      },
    });

    return response.data;
  }

  async duplicateSheet(options: {
    spreadsheetId: string;
    sourceSheetId: number;
    newSheetName?: string;
    insertSheetIndex?: number;
  }) {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: options.spreadsheetId,
      requestBody: {
        requests: [
          {
            duplicateSheet: {
              sourceSheetId: options.sourceSheetId,
              insertSheetIndex: options.insertSheetIndex,
              newSheetName: options.newSheetName,
            },
          },
        ],
      },
    });

    return response.data;
  }

  async renameSheet(spreadsheetId: string, sheetId: number, newTitle: string) {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId,
                title: newTitle,
              },
              fields: "title",
            },
          },
        ],
      },
    });

    return response.data;
  }

  // Row/Column Operations
  async insertRows(options: {
    spreadsheetId: string;
    sheetId: number;
    startIndex: number;
    endIndex: number;
  }) {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: options.spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: options.sheetId,
                dimension: "ROWS",
                startIndex: options.startIndex,
                endIndex: options.endIndex,
              },
            },
          },
        ],
      },
    });

    return response.data;
  }

  async insertColumns(options: {
    spreadsheetId: string;
    sheetId: number;
    startIndex: number;
    endIndex: number;
  }) {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: options.spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: options.sheetId,
                dimension: "COLUMNS",
                startIndex: options.startIndex,
                endIndex: options.endIndex,
              },
            },
          },
        ],
      },
    });

    return response.data;
  }

  async deleteRows(options: {
    spreadsheetId: string;
    sheetId: number;
    startIndex: number;
    endIndex: number;
  }) {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: options.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: options.sheetId,
                dimension: "ROWS",
                startIndex: options.startIndex,
                endIndex: options.endIndex,
              },
            },
          },
        ],
      },
    });

    return response.data;
  }

  async deleteColumns(options: {
    spreadsheetId: string;
    sheetId: number;
    startIndex: number;
    endIndex: number;
  }) {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: options.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: options.sheetId,
                dimension: "COLUMNS",
                startIndex: options.startIndex,
                endIndex: options.endIndex,
              },
            },
          },
        ],
      },
    });

    return response.data;
  }

  // Formatting Operations
  async formatCells(options: {
    spreadsheetId: string;
    sheetId: number;
    startRowIndex: number;
    endRowIndex: number;
    startColumnIndex: number;
    endColumnIndex: number;
    format: {
      backgroundColor?: { red: number; green: number; blue: number };
      textFormat?: {
        bold?: boolean;
        italic?: boolean;
        fontSize?: number;
        foregroundColor?: { red: number; green: number; blue: number };
      };
      horizontalAlignment?: "LEFT" | "CENTER" | "RIGHT";
      verticalAlignment?: "TOP" | "MIDDLE" | "BOTTOM";
    };
  }) {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: options.spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: options.sheetId,
                startRowIndex: options.startRowIndex,
                endRowIndex: options.endRowIndex,
                startColumnIndex: options.startColumnIndex,
                endColumnIndex: options.endColumnIndex,
              },
              cell: {
                userEnteredFormat: options.format,
              },
              fields: "userEnteredFormat",
            },
          },
        ],
      },
    });

    return response.data;
  }

  // Helper Methods
  async findRowByValue(options: {
    spreadsheetId: string;
    range: string;
    columnIndex: number;
    value: any;
  }): Promise<number | null> {
    const data = await this.getValues({
      spreadsheetId: options.spreadsheetId,
      range: options.range,
    });

    if (!data.values) return null;

    for (let i = 0; i < data.values.length; i++) {
      if (data.values[i][options.columnIndex] === options.value) {
        return i;
      }
    }

    return null;
  }

  async getLastRowIndex(spreadsheetId: string, range: string): Promise<number> {
    const data = await this.getValues({
      spreadsheetId,
      range,
    });

    return data.values ? data.values.length : 0;
  }
}
