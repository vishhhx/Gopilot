import { google, drive_v3 } from "googleapis";
import { ENV } from "../../config";

export class DriveService {
  private oauth2Client: any;
  private drive: drive_v3.Drive;

  constructor(refreshToken: string) {
    if (!ENV.GOOGLE_CLIENT_ID || !ENV.GOOGLE_CLIENT_SECRET || !ENV.GOOGLE_REDIRECT_URI) {
      throw new Error("Google API credentials are missing in environment variables.");
    }

    this.oauth2Client = new google.auth.OAuth2(
      ENV.GOOGLE_CLIENT_ID,
      ENV.GOOGLE_CLIENT_SECRET,
      ENV.GOOGLE_REDIRECT_URI
    );

    if (!refreshToken) {
      throw new Error("No required credentials are provided");
    }

    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    this.drive = google.drive({ version: "v3", auth: this.oauth2Client });
  }

  // ==================== FOLDER OPERATIONS ====================

  async createFolder(folderName: string, parentFolderId?: string) {
    try {
      const fileMetadata: any = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: parentFolderId ? [parentFolderId] : ["root"],
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: "id, name, parents, webViewLink",
      });

      return {
        id: response.data.id,
        name: response.data.name,
        parents: response.data.parents,
        link: response.data.webViewLink,
      };
    } catch (err: any) {
      throw new Error(err.message || "Failed to create folder");
    }
  }

  async getFolderByName(folderName: string) {
    try {
      const response = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        spaces: "drive",
        fields: "files(id, name, webViewLink)",
        pageSize: 1,
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0];
      }

      return null;
    } catch (error: any) {
      throw error;
    }
  }

  async listFolders(pageSize: number = 10) {
    try {
      const response = await this.drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
        spaces: "drive",
        fields: "files(id, name, createdTime, webViewLink)",
        pageSize,
      });

      return {
        folders: response.data.files || [],
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error: any) {
      throw error;
    }
  }

  async deleteFolder(folderId: string) {
    try {
      await this.drive.files.delete({ fileId: folderId });
      return { success: true };
    } catch (error: any) {
      throw error;
    }
  }

  // ==================== FILE OPERATIONS ====================

  async uploadFile(fileName: string, fileContent: string, mimeType: string = "text/plain", parentFolderId?: string) {
    try {
      const fileMetadata: any = {
        name: fileName,
        parents: parentFolderId ? [parentFolderId] : undefined,
      };

      const media = {
        mimeType,
        body: fileContent,
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: "id, name, webViewLink, webContentLink, mimeType",
      });

      return {
        id: response.data.id,
        name: response.data.name,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
        mimeType: response.data.mimeType,
      };
    } catch (error: any) {
      throw error;
    }
  }

  async uploadCsv(fileName: string, csvContent: string, parentFolderId?: string) {
    return this.uploadFile(fileName, csvContent, "text/csv", parentFolderId);
  }

  async uploadJson(fileName: string, jsonData: any, parentFolderId?: string) {
    const jsonString = JSON.stringify(jsonData, null, 2);
    return this.uploadFile(fileName, jsonString, "application/json", parentFolderId);
  }

  async listFiles(folderId?: string, pageSize: number = 10) {
    try {
      let query = "trashed=false";
      if (folderId) query += ` and '${folderId}' in parents`;

      const response = await this.drive.files.list({
        q: query,
        spaces: "drive",
        fields: "files(id, name, createdTime, webViewLink, mimeType, size)",
        pageSize,
      });

      return { files: response.data.files || [], nextPageToken: response.data.nextPageToken };
    } catch (error: any) {
      throw error;
    }
  }

  async getFile(fileId: string) {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: "id, name, webViewLink, webContentLink, mimeType, size, createdTime",
      });

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async deleteFile(fileId: string) {
    try {
      await this.drive.files.delete({ fileId });
      return { success: true };
    } catch (error: any) {
      throw error;
    }
  }

  async downloadFile(fileId: string) {
    try {
      const response = await this.drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // ==================== SHARING OPERATIONS ====================

  async sharePublic(fileId: string) {
    try {
      await this.drive.permissions.create({
        fileId,
        requestBody: { role: "reader", type: "anyone" },
      });

      const file = await this.getFile(fileId);

      return { fileId, name: file.name, webViewLink: file.webViewLink, public: true };
    } catch (error: any) {
      throw error;
    }
  }

  async shareWithEmail(fileId: string, email: string, role: string = "reader") {
    try {
      await this.drive.permissions.create({
        fileId,
        requestBody: { emailAddress: email, role, type: "user" },
      });

      const file = await this.getFile(fileId);
      return { fileId, name: file.name, sharedWith: email, role };
    } catch (error: any) {
      throw error;
    }
  }

  async getPermissions(fileId: string) {
    try {
      const response = await this.drive.permissions.list({
        fileId,
        fields: "permissions(id, type, role, emailAddress)",
      });
      return response.data.permissions || [];
    } catch (error: any) {
      throw error;
    }
  }

  async removePermission(fileId: string, permissionId: string) {
    try {
      await this.drive.permissions.delete({ fileId, permissionId });
      return { success: true };
    } catch (error: any) {
      throw error;
    }
  }

  // ==================== SEARCH & FILTER ====================

  async searchFiles(fileName: string, pageSize: number = 10) {
    try {
      const response = await this.drive.files.list({
        q: `name contains '${fileName}' and trashed=false`,
        spaces: "drive",
        fields: "files(id, name, webViewLink, createdTime, mimeType)",
        pageSize,
      });

      return { results: response.data.files || [], nextPageToken: response.data.nextPageToken };
    } catch (error: any) {
      throw error;
    }
  }

  async getStorageQuota() {
    try {
      const response = await this.drive.about.get({ fields: "storageQuota" });
      const quota = response.data.storageQuota;

      const usedPercent = ((quota?.usage || 0) / (quota?.limit || 1)) * 100;

      return {
        used: quota?.usage,
        limit: quota?.limit,
        usedPercent: usedPercent.toFixed(2),
      };
    } catch (error: any) {
      throw error;
    }
  }
}
