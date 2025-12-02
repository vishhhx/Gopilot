import { google } from "googleapis";
import { ENV } from "../../config";

// Form Agent Service - In-Memory Implementation (No Backend API Calls)
export class FormAgentService {
  private oauth2Client;
  private googleSheets: any;
  private backendUrl: string;
  private frontendUrl: string;

  // ==================== STATIC SHARED STORAGE ====================
  // Shared across all FormAgentService instances
  private static sharedFormsStore: Map<string, FormData> = new Map();
  private static sharedResponsesStore: Map<string, FormResponse[]> = new Map();

  // Reference to shared storage
  private formsStore: Map<string, FormData>;
  private responsesStore: Map<string, FormResponse[]>;

  constructor(refreshToken: string) {
    // ==================== VALIDATE GOOGLE CREDENTIALS ====================
    if (
      !ENV.GOOGLE_CLIENT_ID ||
      !ENV.GOOGLE_CLIENT_SECRET ||
      !ENV.GOOGLE_REDIRECT_URI
    ) {
      throw new Error(
        "Google API credentials are missing in environment variables."
      );
    }

    if (!refreshToken) {
      throw new Error("No required credentials are provided");
    }

    // ==================== INITIALIZE GOOGLE AUTH ====================
    this.oauth2Client = new google.auth.OAuth2(
      ENV.GOOGLE_CLIENT_ID,
      ENV.GOOGLE_CLIENT_SECRET,
      ENV.GOOGLE_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    this.googleSheets = google.sheets({
      version: "v4",
      auth: this.oauth2Client,
    });

    // ==================== INITIALIZE URLS ====================
    this.backendUrl = ENV.BACKEND_URL || "http://localhost:5000";
    this.frontendUrl = ENV.FRONTEND_URL || "http://localhost:5173";

    // ==================== USE SHARED STORAGE ====================
    // All instances share the same storage
    this.formsStore = FormAgentService.sharedFormsStore;
    this.responsesStore = FormAgentService.sharedResponsesStore;

    console.log("✅ FormAgentService initialized (In-Memory)");
    console.log(`   Backend URL: ${this.backendUrl}`);
    console.log(`   Frontend URL: ${this.frontendUrl}`);
    console.log(`   Shareable Link will be: ${this.frontendUrl}/form/{formId}`);
    console.log(`   Shared Storage - Forms: ${this.formsStore.size}, Responses: ${this.responsesStore.size}`);
  }

  // ==================== READ OPERATIONS ====================

  async listForms(options?: {
    maxResults?: number;
    pageToken?: string;
    status?: "active" | "draft" | "archived";
    sortBy?: "created" | "modified" | "name";
  }) {
    try {
      // Filter forms by status from in-memory store
      const status = options?.status || "active";
      const forms = Array.from(this.formsStore.values()).filter(
        (f) => f.status === status
      );

      console.log(`📋 Found ${forms.length} ${status} forms in memory`);

      return {
        forms: forms.slice(0, options?.maxResults || 100),
        nextPageToken: null,
        totalResults: forms.length,
      };
    } catch (error: any) {
      console.error("❌ Error listing forms:", error.message);
      return {
        forms: [],
        nextPageToken: null,
        totalResults: 0,
      };
    }
  }

  async getForm(formId: string) {
    try {
      const form = this.formsStore.get(formId);

      if (!form) {
        console.warn(`⚠️  Form not found: ${formId}`);
        return {
          id: formId,
          title: "Form not found",
          description: "",
          questions: [],
          settings: {
            allowMultipleResponses: false,
            collectEmails: false,
            showProgress: false,
            shuffleQuestions: false,
          },
        };
      }

      console.log(`✅ Retrieved form: ${form.title}`);
      return form;
    } catch (error: any) {
      console.error("❌ Error fetching form:", error.message);
      return {
        id: formId,
        title: "Error loading form",
        description: "",
        questions: [],
        settings: {
          allowMultipleResponses: false,
          collectEmails: false,
          showProgress: false,
          shuffleQuestions: false,
        },
      };
    }
  }

  async listResponses(
    formId: string,
    options?: {
      maxResults?: number;
      pageToken?: string;
      filter?: string;
      sortBy?: "newest" | "oldest";
    }
  ) {
    try {
      const responses = this.responsesStore.get(formId) || [];

      console.log(`✅ Retrieved ${responses.length} responses for form ${formId}`);

      return {
        responses: responses.slice(0, options?.maxResults || 100),
        nextPageToken: null,
        totalResults: responses.length,
      };
    } catch (error: any) {
      console.error("❌ Error fetching responses:", error.message);
      return {
        responses: [],
        nextPageToken: null,
        totalResults: 0,
      };
    }
  }

  async getResponse(formId: string, responseId: string) {
    try {
      const responses = this.responsesStore.get(formId) || [];
      const response = responses.find((r) => r.id === responseId);

      if (!response) {
        console.warn(`⚠️  Response not found: ${responseId}`);
        return null;
      }

      console.log(`✅ Retrieved response: ${responseId}`);
      return response;
    } catch (error: any) {
      console.error("❌ Error fetching response:", error.message);
      return null;
    }
  }

  async exportResponses(formId: string, format: "json" | "csv" = "csv") {
    try {
      const responses = this.responsesStore.get(formId) || [];

      console.log(`📤 Exporting ${responses.length} responses as ${format}`);

      return {
        format,
        data: responses,
        exportedAt: new Date(),
      };
    } catch (error: any) {
      console.error("❌ Error exporting responses:", error.message);
      return {
        format,
        data: [],
        exportedAt: new Date(),
      };
    }
  }

  // ==================== WRITE OPERATIONS ====================

  async createForm(options: {
    title: string;
    description?: string;
    questions: FormQuestion[];
    settings?: Partial<FormSettings>;
  }) {
    const formId = this.generateId();
    const form: FormData = {
      id: formId,
      title: options.title,
      description: options.description || "",
      questions: options.questions,
      settings: {
        allowMultipleResponses: false,
        collectEmails: false,
        showProgress: false,
        shuffleQuestions: false,
        ...options.settings,
      },
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      shareableLink: this.generateShareableLink(formId),
      embedCode: this.generateEmbedCode(formId),
      shortLink: this.generateShortLink(formId),
    };

    // Store in memory
    this.formsStore.set(formId, form);
    this.responsesStore.set(formId, []);

    console.log(`✅ Form created in memory: ${form.id}`);
    console.log(`   Title: ${form.title}`);
    console.log(`   Questions: ${form.questions.length}`);

    return form;
  }

  async submitResponse(
    formId: string,
    options: {
      answers: FormAnswer[];
      responderEmail?: string;
      metadata?: {
        ipAddress?: string;
        userAgent?: string;
        submittedAt?: Date;
      };
    }
  ) {
    try {
      // Check if form exists
      if (!this.formsStore.has(formId)) {
        throw new Error(`Form ${formId} not found`);
      }

      const response: FormResponse = {
        id: this.generateId(),
        formId,
        answers: options.answers,
        responderEmail: options.responderEmail,
        metadata: {
          ipAddress: options.metadata?.ipAddress,
          userAgent: options.metadata?.userAgent,
          submittedAt: options.metadata?.submittedAt || new Date(),
        },
        status: "submitted",
      };

      // Store response in memory
      if (!this.responsesStore.has(formId)) {
        this.responsesStore.set(formId, []);
      }
      this.responsesStore.get(formId)!.push(response);

      console.log(`✅ Response submitted: ${response.id}`);

      return response;
    } catch (error: any) {
      console.error("❌ Error submitting response:", error.message);
      throw error;
    }
  }

  async updateForm(formId: string, updates: Partial<FormData>) {
    try {
      const form = this.formsStore.get(formId);

      if (!form) {
        throw new Error(`Form ${formId} not found`);
      }

      const updatedForm = {
        ...form,
        ...updates,
        updatedAt: new Date(),
      };

      this.formsStore.set(formId, updatedForm);

      console.log(`✅ Form updated: ${formId}`);

      return updatedForm;
    } catch (error: any) {
      console.error("❌ Error updating form:", error.message);
      throw error;
    }
  }

  async duplicateForm(formId: string, newTitle: string) {
    try {
      const originalForm = await this.getForm(formId);

      if (!originalForm || originalForm.title === "Form not found") {
        throw new Error(`Form ${formId} not found`);
      }

      return this.createForm({
        title: newTitle,
        description: originalForm.description,
        questions: originalForm.questions,
        settings: originalForm.settings,
      });
    } catch (error: any) {
      console.error("❌ Error duplicating form:", error.message);
      throw error;
    }
  }

  // ==================== FORM LOGIC OPERATIONS ====================

  async addQuestion(formId: string, question: FormQuestion) {
    try {
      const form = await this.getForm(formId);

      if (!form || form.title === "Form not found") {
        throw new Error(`Form ${formId} not found`);
      }

      form.questions.push(question);
      return this.updateForm(formId, { questions: form.questions });
    } catch (error: any) {
      console.error("❌ Error adding question:", error.message);
      throw error;
    }
  }

  async removeQuestion(formId: string, questionId: string) {
    try {
      const form = await this.getForm(formId);

      if (!form || form.title === "Form not found") {
        throw new Error(`Form ${formId} not found`);
      }

      form.questions = form.questions.filter((q) => q.id !== questionId);
      return this.updateForm(formId, { questions: form.questions });
    } catch (error: any) {
      console.error("❌ Error removing question:", error.message);
      throw error;
    }
  }

  async reorderQuestions(formId: string, questionIds: string[]) {
    try {
      const form = await this.getForm(formId);

      if (!form || form.title === "Form not found") {
        throw new Error(`Form ${formId} not found`);
      }

      const questionMap = new Map(form.questions.map((q) => [q.id, q]));
      const reorderedQuestions = questionIds
        .map((id) => questionMap.get(id))
        .filter((q) => q !== undefined) as FormQuestion[];

      return this.updateForm(formId, { questions: reorderedQuestions });
    } catch (error: any) {
      console.error("❌ Error reordering questions:", error.message);
      throw error;
    }
  }

  async validateResponse(
    formId: string,
    response: FormResponse
  ): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    try {
      const form = await this.getForm(formId);
      const errors: string[] = [];

      if (!form || form.title === "Form not found") {
        return {
          isValid: false,
          errors: [`Form ${formId} not found`],
        };
      }

      for (const question of form.questions) {
        if (question.required) {
          const answer = response.answers.find(
            (a) => a.questionId === question.id
          );
          if (!answer || !answer.value) {
            errors.push(`Question "${question.title}" is required`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error: any) {
      console.error("❌ Error validating response:", error.message);
      return {
        isValid: false,
        errors: [error.message],
      };
    }
  }

  // ==================== DELETE/ARCHIVE OPERATIONS ====================

  async deleteForm(formId: string) {
    try {
      if (!this.formsStore.has(formId)) {
        throw new Error(`Form ${formId} not found`);
      }

      this.formsStore.delete(formId);
      this.responsesStore.delete(formId);

      console.log(`✅ Form deleted: ${formId}`);

      return { success: true };
    } catch (error: any) {
      console.error("❌ Error deleting form:", error.message);
      throw error;
    }
  }

  async archiveForm(formId: string) {
    try {
      return this.updateForm(formId, { status: "archived" });
    } catch (error: any) {
      console.error("❌ Error archiving form:", error.message);
      throw error;
    }
  }

  async clearResponses(formId: string) {
    try {
      if (!this.formsStore.has(formId)) {
        throw new Error(`Form ${formId} not found`);
      }

      const count = this.responsesStore.get(formId)?.length || 0;
      this.responsesStore.set(formId, []);

      console.log(`✅ Cleared ${count} responses for form: ${formId}`);

      return { success: true, message: "All responses cleared" };
    } catch (error: any) {
      console.error("❌ Error clearing responses:", error.message);
      throw error;
    }
  }

  async deleteResponse(formId: string, responseId: string) {
    try {
      const responses = this.responsesStore.get(formId) || [];
      const filtered = responses.filter((r) => r.id !== responseId);
      this.responsesStore.set(formId, filtered);

      console.log(`✅ Response deleted: ${responseId}`);

      return { success: true };
    } catch (error: any) {
      console.error("❌ Error deleting response:", error.message);
      throw error;
    }
  }

  // ==================== ADVANCED FEATURES ====================

  async enableResponseNotification(
    formId: string,
    notificationEmail: string
  ) {
    try {
      return this.updateForm(formId, {
        notifications: {
          email: notificationEmail,
          enabled: true,
        } as any,
      });
    } catch (error: any) {
      console.error("❌ Error enabling notifications:", error.message);
      throw error;
    }
  }

  async setFormExpiration(formId: string, expiryDate: Date) {
    try {
      return this.updateForm(formId, { expiresAt: expiryDate } as any);
    } catch (error: any) {
      console.error("❌ Error setting expiration:", error.message);
      throw error;
    }
  }

  async syncToGoogleSheets(formId: string, spreadsheetId: string) {
    try {
      const responses = this.responsesStore.get(formId) || [];
      const values = responses.map((r) => [
        r.id,
        r.responderEmail,
        JSON.stringify(r.answers),
        r.metadata?.submittedAt,
      ]);

      await this.googleSheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Sheet1!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values },
      });

      console.log(`✅ Synced ${responses.length} responses to Google Sheets`);

      return { synced: true, count: responses.length };
    } catch (error: any) {
      console.error("❌ Error syncing to sheets:", error.message);
      throw error;
    }
  }

  async generateAnalytics(formId: string) {
    try {
      const responses = this.responsesStore.get(formId) || [];

      console.log(`📊 Generated analytics for form: ${formId}`);

      return {
        totalResponses: responses.length,
        completionRate: 100,
        averageTimeToComplete: 0,
        responsesByDay: [],
        questionAnalytics: [],
      };
    } catch (error: any) {
      console.error("❌ Error generating analytics:", error.message);
      throw error;
    }
  }

  // ==================== UTILITIES ====================

  private generateId(): string {
    return `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateShareableLink(formId: string): string {
    if (!this.frontendUrl || this.frontendUrl === "undefined") {
      console.warn("⚠️  Frontend URL is undefined, using fallback");
      return `http://localhost:5173/form/${formId}`;
    }
    return `${this.frontendUrl}/form/${formId}`;
  }

  private generateShortLink(formId: string): string {
    const shortId = formId.split("_")[2];
    if (!this.frontendUrl || this.frontendUrl === "undefined") {
      console.warn("⚠️  Frontend URL is undefined, using fallback");
      return `http://localhost:5173/f/${shortId}`;
    }
    return `${this.frontendUrl}/f/${shortId}`;
  }

  private generateEmbedCode(formId: string): string {
    return `<iframe src="${this.generateShareableLink(
      formId
    )}" width="100%" height="800" frameborder="0"></iframe>`;
  }

  getBackendUrl(): string {
    return this.backendUrl;
  }

  getFrontendUrl(): string {
    return this.frontendUrl;
  }
}

// ==================== TYPE DEFINITIONS ====================

interface FormQuestion {
  id: string;
  title: string;
  type:
    | "shortText"
    | "longText"
    | "multipleChoice"
    | "checkbox"
    | "dropdown"
    | "rating"
    | "date";
  required: boolean;
  options?: string[];
  placeholder?: string;
  description?: string;
}

interface FormAnswer {
  questionId: string;
  value: string | string[] | number;
}

interface FormResponse {
  id: string;
  formId: string;
  answers: FormAnswer[];
  responderEmail?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    submittedAt?: Date;
  };
  status: "submitted" | "draft" | "incomplete";
}

interface FormSettings {
  allowMultipleResponses: boolean;
  collectEmails: boolean;
  showProgress: boolean;
  shuffleQuestions: boolean;
  notifications?: {
    email: string;
    enabled: boolean;
  };
  expiresAt?: Date;
}

interface FormData extends FormSettings {
  id: string;
  title: string;
  description: string;
  questions: FormQuestion[];
  status?: "active" | "draft" | "archived";
  createdAt: Date;
  updatedAt: Date;
  shareableLink?: string;
  embedCode?: string;
  shortLink?: string;
}