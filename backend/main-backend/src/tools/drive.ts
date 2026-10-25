import { tool, RunContext } from "@openai/agents";
import { z } from "zod";
import { DriveService } from "../utils/google/drive";

export interface Tokens {
  service: string;
  refreshToken: string;
}

function getRefreshToken(context: any) {
  // Chat runs pass the token list itself as context.
  if (Array.isArray(context)) {
    const found = context.find((t) => t.service === "drive");
    if (!found?.refreshToken) {
      throw new Error("No refresh token for drive service found");
    }
    return found.refreshToken;
  }

  // If inside context.drive array
  if (Array.isArray(context.drive)) {
    const found = context.drive.find((t) => t.service === "drive");
    if (!found || !found.refreshToken) {
      throw new Error("No refresh token for drive service found");
    }
    return found.refreshToken;
  }

  // If context.drive is object
  if (context.drive?.refreshToken) {
    return context.drive.refreshToken;
  }

  throw new Error("No refresh token for drive service found");
}

// ==================== FOLDER TOOLS ====================

// export const createFolderTool = tool({
//   name: "create_folder",
//   description: `
// Create a new folder in Google Drive.
// Parameters:
// - folderName: Name of the folder (required)
// - parentFolderId: ID of parent folder (optional)
//   `,
//   parameters: z.object({
//     folderName: z.string().min(1).describe("Folder name"),
//     parentFolderId: z.string().describe("Parent folder ID or empty string"),
//   }),
//   execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
//     try {
//       if (runContext === undefined) {
//         throw new Error("No refresh token found");
//       }
//       const refreshToken = getRefreshToken(runContext.context);

//       if (!refreshToken) {
//         return {
//           success: false,
//           error: "Missing refresh token in context.",
//         };
//       }

//       const driveService = new DriveService(refreshToken);
//       const result = await driveService.createFolder(
//         args.folderName,
//         args.parentFolderId || undefined
//       );

//       return {
//         success: true,
//         message: "Folder created successfully",
//         data: result,
//       };
//     } catch (error: any) {
//       return {
//         success: false,
//         error: error.message || "Failed to create folder",
//       };
//     }
//   },
// });
// export const createFolderTool = tool({
//   name: "create_folder",
//   description: `
// Create a new folder in Google Drive.
// Parameters:
// - folderName: Name of the folder (required)
// - parentFolderId: ID of parent folder (optional)
//   `,
//   parameters: z.object({
//     folderName: z.string().min(1).describe("Folder name"),
//     parentFolderId: z.string().describe("Parent folder ID (optional)"),
//   }),
//   execute: async (args: { folderName: string; parentFolderId?: string }, runContext?: RunContext<Tokens[]>) => {

//     try {
//       console.log("token is.....", runContext)

//       // if (!runContext || !Array.isArray(runContext.context)) {
//       //   throw new Error("No refresh token context provided or invalid context format.");
//       // }

//       // ✅ Get the refresh token
//       const refreshToken = getRefreshToken(runContext.context);
//       if (!refreshToken) {
//         throw new Error("Missing refresh token in context.");
//       }

//       // ✅ Initialize Drive service
//       const driveService = new DriveService(refreshToken);

//       // ✅ Create folder in Drive
//       const result = await driveService.createFolder(args.folderName, args.parentFolderId || undefined);

//       // ✅ Return real folder ID
//       return {
//         success: true,
//         message: `Folder "${result.name}" created successfully`,
//         data: {
//           folderId: result.id,    // real folder ID
//           folderName: result.name
//         }
//       };
//     } catch (error: any) {
//       return {
//         success: false,
//         error: error.message || "Failed to create folder",
//       };
//     }
//   },
// });
export const createFolderTool = tool({
  name: "create_folder",
  description: `
Create a new folder in Google Drive.
Parameters:
- folderName: Name of the folder (required)
- parentFolderId: ID of parent folder (optional)
  `,
  parameters: z.object({
    folderName: z.string().min(1).describe("Folder name"),
    parentFolderId: z.string().describe("Parent folder ID (optional)"),
  }),
  execute: async (args: { folderName: string; parentFolderId?: string }, runContext?: RunContext<any>) => {
    try {
      if (!runContext) throw new Error("No runContext provided");

      // ✅ Get refresh token from context
      const context = runContext.context;
      const driveTokenObj = Array.isArray(context)
        ? context.find((c) => c.service === "drive")
        : context.drive;

      if (!driveTokenObj?.refreshToken) throw new Error("Missing refresh token");

      const driveService = new DriveService(driveTokenObj.refreshToken);

      // ✅ Create folder
      const result = await driveService.createFolder(args.folderName, args.parentFolderId);

      return {
        success: true,
        message: `Folder "${result.name}" created successfully!`,
        data: {
          folderId: result.id,
          folderName: result.name,
          parents: result.parents,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to create folder",
      };
    }
  },
});
export const getFolderByNameTool = tool({
  name: "get_folder_by_name",
  description: "Find a folder by name in Google Drive.",
  parameters: z.object({
    folderName: z.string().min(1).describe("Folder name to search"),
  }),
  execute: async (
    { folderName },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const driveService = new DriveService(refreshToken);
      const result = await driveService.getFolderByName(folderName);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get folder",
      };
    }
  },
});

export const listFoldersTool = tool({
  name: "list_folders",
  description: "List all folders in Google Drive.",
  parameters: z.object({
    pageSize: z.number().int().min(1).max(100).describe("Number of folders to return"),
  }),
  execute: async (
    { pageSize },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const driveService = new DriveService(refreshToken);
      const result = await driveService.listFolders(pageSize || 10);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to list folders",
      };
    }
  },
});

export const deleteFolderTool = tool({
  name: "delete_folder",
  description: "Delete a folder from Google Drive.",
  parameters: z.object({
    folderId: z.string().min(1).describe("Folder ID to delete"),
  }),
  needsApproval: true,
  execute: async (
    { folderId },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const driveService = new DriveService(refreshToken);
      const result = await driveService.deleteFolder(folderId);

      return {
        success: true,
        message: "Folder deleted successfully",
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to delete folder",
      };
    }
  },
});

// ==================== FILE TOOLS ====================

export const uploadFileTool = tool({
  name: "upload_file",
  description: `
Upload a file to Google Drive.
Parameters:
- fileName: Name of the file (required)
- fileContent: File content as string (required)
- mimeType: MIME type (default: text/plain)
- parentFolderId: Parent folder ID (optional)
  `,
  parameters: z.object({
    fileName: z.string().min(1).describe("File name"),
    fileContent: z.string().min(1).describe("File content"),
    mimeType: z.string().describe("MIME type (e.g., text/csv, application/json)"),
    parentFolderId: z.string().describe("Parent folder ID or empty string"),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const driveService = new DriveService(refreshToken);
      const result = await driveService.uploadFile(
        args.fileName,
        args.fileContent,
        args.mimeType || "text/plain",
        args.parentFolderId || undefined
      );

      return {
        success: true,
        message: "File uploaded successfully",
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to upload file",
      };
    }
  },
});

export const uploadCsvTool = tool({
  name: "upload_csv",
  description: "Upload a CSV file to Google Drive.",
  parameters: z.object({
    fileName: z.string().min(1).describe("CSV file name"),
    csvContent: z.string().min(1).describe("CSV content"),
    parentFolderId: z.string().describe("Parent folder ID or empty string"),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const driveService = new DriveService(refreshToken);
      const result = await driveService.uploadCsv(
        args.fileName,
        args.csvContent,
        args.parentFolderId || undefined
      );

      return {
        success: true,
        message: "CSV uploaded successfully",
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to upload CSV",
      };
    }
  },
});

export const uploadJsonTool = tool({
  name: "upload_json",
  description: "Upload a JSON file to Google Drive.",
  parameters: z.object({
    fileName: z.string().min(1).describe("JSON file name"),
    jsonData: z.string().describe("JSON data as string"),
    parentFolderId: z.string().describe("Parent folder ID or empty string"),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const driveService = new DriveService(refreshToken);
      const jsonData = JSON.parse(args.jsonData);
      const result = await driveService.uploadJson(
        args.fileName,
        jsonData,
        args.parentFolderId || undefined
      );

      return {
        success: true,
        message: "JSON uploaded successfully",
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to upload JSON",
      };
    }
  },
});

export const listFilesTool = tool({
  name: "list_files",
  description: "List files in Google Drive or a specific folder.",
  parameters: z.object({
    folderId: z.string().describe("Folder ID or empty string for all files"),
    pageSize: z.number().int().min(1).max(100).describe("Number of files to return"),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const driveService = new DriveService(refreshToken);
      const result = await driveService.listFiles(
        args.folderId || undefined,
        args.pageSize || 10
      );

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to list files",
      };
    }
  },
});

export const getFileTool = tool({
  name: "get_file",
  description: "Get details of a specific file.",
  parameters: z.object({
    fileId: z.string().min(1).describe("File ID"),
  }),
  execute: async (
    { fileId },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const driveService = new DriveService(refreshToken);
      const result = await driveService.getFile(fileId);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get file",
      };
    }
  },
});

export const deleteFileTool = tool({
  name: "delete_file",
  description: "Delete a file from Google Drive.",
  parameters: z.object({
    fileId: z.string().min(1).describe("File ID to delete"),
  }),
  needsApproval: true,
  execute: async (
    { fileId },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const driveService = new DriveService(refreshToken);
      const result = await driveService.deleteFile(fileId);

      return {
        success: true,
        message: "File deleted successfully",
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to delete file",
      };
    }
  },
});

export const searchFilesTool = tool({
  name: "search_files",
  description: "Search files by name in Google Drive.",
  parameters: z.object({
    fileName: z.string().min(1).describe("File name to search"),
    pageSize: z.number().int().min(1).max(100).describe("Number of results to return"),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const driveService = new DriveService(refreshToken);
      const result = await driveService.searchFiles(
        args.fileName,
        args.pageSize || 10
      );

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to search files",
      };
    }
  },
});

// ==================== SHARING TOOLS ====================

export const sharePublicTool = tool({
  name: "share_public",
  description: "Share a file/folder publicly on Google Drive.",
  parameters: z.object({
    fileId: z.string().min(1).describe("File/Folder ID to share"),
  }),
  execute: async (
    { fileId },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const driveService = new DriveService(refreshToken);
      const result = await driveService.sharePublic(fileId);

      return {
        success: true,
        message: "File shared publicly",
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to share file",
      };
    }
  },
});

export const shareWithEmailTool = tool({
  name: "share_with_email",
  description: "Share a file/folder with a specific email address.",
  parameters: z.object({
    fileId: z.string().min(1).describe("File/Folder ID to share"),
    email: z.string().email().describe("Email address to share with"),
    role: z.enum(["reader", "writer", "commenter"]).describe("Permission role"),
  }),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const driveService = new DriveService(refreshToken);
      const result = await driveService.shareWithEmail(
        args.fileId,
        args.email,
        args.role
      );

      return {
        success: true,
        message: "File shared with email",
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to share file",
      };
    }
  },
});

export const getPermissionsTool = tool({
  name: "get_permissions",
  description: "Get sharing permissions of a file/folder.",
  parameters: z.object({
    fileId: z.string().min(1).describe("File/Folder ID"),
  }),
  execute: async (
    { fileId },
    runContext?: RunContext<Tokens[]>
  ) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const driveService = new DriveService(refreshToken);
      const result = await driveService.getPermissions(fileId);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get permissions",
      };
    }
  },
});

// ==================== STORAGE TOOLS ====================

export const getStorageQuotaTool = tool({
  name: "get_storage_quota",
  description: "Check Google Drive storage quota and usage.",
  parameters: z.object({}),
  execute: async (args: any, runContext?: RunContext<Tokens[]>) => {
    try {
      if (runContext === undefined) {
        throw new Error("No refresh token found");
      }
      const refreshToken = getRefreshToken(runContext.context);

      if (!refreshToken) {
        return {
          success: false,
          error: "Missing refresh token in context.",
        };
      }

      const driveService = new DriveService(refreshToken);
      const result = await driveService.getStorageQuota();

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get storage quota",
      };
    }
  },
});