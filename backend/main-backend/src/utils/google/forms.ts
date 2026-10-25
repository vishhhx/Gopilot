import { google } from "googleapis";
import { drive_v3, forms_v1 } from "googleapis";
import { ENV } from "../../config";

/*
  Google Forms through the Forms API (forms, questions, responses) and the Drive API (listing,
  copying and trashing, which the Forms API doesn't do).
*/

export type QuestionType =
  | "short_text"
  | "paragraph"
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "linear_scale"
  | "rating"
  | "date"
  | "time";

export interface QuestionInput {
  title: string;
  type: QuestionType;
  required: boolean;
  description?: string | null;
  /** choices for multiple_choice, checkboxes and dropdown */
  options?: string[] | null;
  /** linear_scale: low (0 or 1) to high (2-10); rating: high is the number of stars (3-10) */
  scale?: { low: number; high: number; lowLabel?: string | null; highLabel?: string | null } | null;
}

export interface QuestionSummary {
  itemId: string;
  questionId: string | null;
  title: string;
  type: string;
  required: boolean;
  options: string[] | null;
}

export interface FormSummary {
  formId: string;
  title: string;
  description: string;
  /** where the owner edits the form */
  editUrl: string;
  /** the link to share with respondents */
  responderUrl: string | null;
  isPublished: boolean;
  isAcceptingResponses: boolean;
  questionCount: number;
  questions: QuestionSummary[];
}

const FORM_MIME = "application/vnd.google-apps.form";

const CHOICE_TYPES = {
  multiple_choice: "RADIO",
  checkboxes: "CHECKBOX",
  dropdown: "DROP_DOWN",
} as const;

const toQuestion = (q: QuestionInput): forms_v1.Schema$Question => {
  const required = q.required;
  switch (q.type) {
    case "short_text":
      return { required, textQuestion: { paragraph: false } };
    case "paragraph":
      return { required, textQuestion: { paragraph: true } };
    case "multiple_choice":
    case "checkboxes":
    case "dropdown": {
      const options = [...new Set((q.options ?? []).map((o) => o.trim()).filter(Boolean))];
      if (options.length === 0) throw new Error(`"${q.title}" is a ${q.type} question and needs options.`);
      return {
        required,
        choiceQuestion: { type: CHOICE_TYPES[q.type], options: options.map((value) => ({ value })) },
      };
    }
    case "linear_scale": {
      const low = q.scale?.low === 0 ? 0 : 1;
      const high = Math.min(10, Math.max(2, q.scale?.high ?? 5));
      return {
        required,
        scaleQuestion: {
          low,
          high,
          lowLabel: q.scale?.lowLabel ?? undefined,
          highLabel: q.scale?.highLabel ?? undefined,
        },
      };
    }
    case "rating":
      return {
        required,
        ratingQuestion: { ratingScaleLevel: Math.min(10, Math.max(3, q.scale?.high ?? 5)), iconType: "STAR" },
      };
    case "date":
      return { required, dateQuestion: { includeYear: true, includeTime: false } };
    case "time":
      return { required, timeQuestion: { duration: false } };
  }
};

const questionType = (q: forms_v1.Schema$Question) => {
  if (q.textQuestion) return q.textQuestion.paragraph ? "paragraph" : "short_text";
  if (q.choiceQuestion) {
    const type = q.choiceQuestion.type;
    return type === "CHECKBOX" ? "checkboxes" : type === "DROP_DOWN" ? "dropdown" : "multiple_choice";
  }
  if (q.scaleQuestion) return "linear_scale";
  if (q.ratingQuestion) return "rating";
  if (q.dateQuestion) return "date";
  if (q.timeQuestion) return "time";
  if (q.fileUploadQuestion) return "file_upload";
  return "other";
};

const summarizeForm = (form: forms_v1.Schema$Form): FormSummary => {
  const questions = (form.items ?? []).flatMap((item): QuestionSummary[] => {
    const q = item.questionItem?.question;
    if (!q) return [];
    return [
      {
        itemId: item.itemId!,
        questionId: q.questionId ?? null,
        title: item.title ?? "",
        type: questionType(q),
        required: Boolean(q.required),
        options: q.choiceQuestion?.options?.map((o) => o.value ?? "") ?? null,
      },
    ];
  });
  const state = form.publishSettings?.publishState;
  return {
    formId: form.formId!,
    title: form.info?.title ?? form.info?.documentTitle ?? "Untitled form",
    description: form.info?.description ?? "",
    editUrl: `https://docs.google.com/forms/d/${form.formId}/edit`,
    responderUrl: form.responderUri ?? null,
    // legacy forms have no publishSettings and are always published
    isPublished: state ? Boolean(state.isPublished) : true,
    isAcceptingResponses: state ? Boolean(state.isAcceptingResponses) : true,
    questionCount: questions.length,
    questions,
  };
};

const answerText = (answer: forms_v1.Schema$Answer | undefined) =>
  answer?.textAnswers?.answers?.map((a) => a.value ?? "").join(", ") ??
  (answer?.fileUploadAnswers ? "(file upload)" : "");

export class FormsService {
  private oauth2Client;
  private forms: forms_v1.Forms;
  private drive: drive_v3.Drive;

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
    if (!refreshToken) {
      throw new Error("No required credentials are provided");
    }

    this.oauth2Client = new google.auth.OAuth2(
      ENV.GOOGLE_CLIENT_ID,
      ENV.GOOGLE_CLIENT_SECRET,
      ENV.GOOGLE_REDIRECT_URI
    );
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });

    this.forms = google.forms({ version: "v1", auth: this.oauth2Client });
    this.drive = google.drive({ version: "v3", auth: this.oauth2Client });
  }

  private async fetchForm(formId: string) {
    const { data } = await this.forms.forms.get({ formId });
    return data;
  }

  async getForm(formId: string) {
    return summarizeForm(await this.fetchForm(formId));
  }

  /** Forms in the user's Drive, newest first. */
  async listForms(options: { maxResults?: number; nameContains?: string | null } = {}) {
    const q = [`mimeType='${FORM_MIME}'`, "trashed=false"];
    if (options.nameContains) q.push(`name contains '${options.nameContains.replace(/['\\]/g, "\\$&")}'`);
    const { data } = await this.drive.files.list({
      q: q.join(" and "),
      orderBy: "modifiedTime desc",
      pageSize: Math.min(100, options.maxResults ?? 20),
      fields: "files(id,name,modifiedTime,createdTime)",
    });
    return (data.files ?? []).map((f) => ({
      formId: f.id!,
      title: f.name ?? "Untitled form",
      modifiedTime: f.modifiedTime ?? null,
      createdTime: f.createdTime ?? null,
      editUrl: `https://docs.google.com/forms/d/${f.id}/edit`,
    }));
  }

  /**
   * Creates the form, adds the questions, and publishes it so the responder link works.
   * Forms created through the API after 30 June 2026 start unpublished.
   */
  async createForm(options: { title: string; description?: string | null; questions: QuestionInput[] }) {
    const { data } = await this.forms.forms.create({
      requestBody: { info: { title: options.title, documentTitle: options.title } },
    });
    const formId = data.formId!;

    const requests: forms_v1.Schema$Request[] = [];
    if (options.description) {
      requests.push({ updateFormInfo: { info: { description: options.description }, updateMask: "description" } });
    }
    options.questions.forEach((q, index) => requests.push(this.createItemRequest(q, index)));
    if (requests.length) {
      await this.forms.forms.batchUpdate({ formId, requestBody: { requests } });
    }

    await this.setPublishState(formId, { isPublished: true, isAcceptingResponses: true });
    return this.getForm(formId);
  }

  private createItemRequest(q: QuestionInput, index: number): forms_v1.Schema$Request {
    return {
      createItem: {
        item: {
          title: q.title,
          description: q.description ?? undefined,
          questionItem: { question: toQuestion(q) },
        },
        location: { index },
      },
    };
  }

  /** Adds questions at `position` (0-based), or at the end. */
  async addQuestions(formId: string, questions: QuestionInput[], position?: number | null) {
    const form = await this.fetchForm(formId);
    const start = Math.min(position ?? Infinity, form.items?.length ?? 0);
    await this.forms.forms.batchUpdate({
      formId,
      requestBody: { requests: questions.map((q, i) => this.createItemRequest(q, start + i)) },
    });
    return this.getForm(formId);
  }

  async updateQuestion(
    formId: string,
    itemId: string,
    changes: { title?: string | null; description?: string | null; required?: boolean | null; options?: string[] | null }
  ) {
    const form = await this.fetchForm(formId);
    const index = (form.items ?? []).findIndex((i) => i.itemId === itemId);
    const item = form.items?.[index];
    const question = item?.questionItem?.question;
    if (!item || !question) throw new Error(`No question with itemId ${itemId} in this form.`);

    const mask: string[] = [];
    const updated: forms_v1.Schema$Item = { itemId, questionItem: { question: { ...question } } };
    if (changes.title != null) {
      updated.title = changes.title;
      mask.push("title");
    }
    if (changes.description != null) {
      updated.description = changes.description;
      mask.push("description");
    }
    if (changes.required != null) {
      updated.questionItem!.question!.required = changes.required;
      mask.push("questionItem.question.required");
    }
    if (changes.options != null) {
      if (!question.choiceQuestion) throw new Error("Only multiple choice, checkbox and dropdown questions have options.");
      updated.questionItem!.question!.choiceQuestion = {
        type: question.choiceQuestion.type,
        options: changes.options.map((value) => ({ value })),
      };
      mask.push("questionItem.question.choiceQuestion");
    }
    if (mask.length === 0) throw new Error("Nothing to change: give a title, description, required or options.");

    await this.forms.forms.batchUpdate({
      formId,
      requestBody: { requests: [{ updateItem: { item: updated, location: { index }, updateMask: mask.join(",") } }] },
    });
    return this.getForm(formId);
  }

  async deleteQuestion(formId: string, itemId: string) {
    const form = await this.fetchForm(formId);
    const index = (form.items ?? []).findIndex((i) => i.itemId === itemId);
    if (index === -1) throw new Error(`No question with itemId ${itemId} in this form.`);
    await this.forms.forms.batchUpdate({
      formId,
      requestBody: { requests: [{ deleteItem: { location: { index } } }] },
    });
    return this.getForm(formId);
  }

  async updateInfo(formId: string, changes: { title?: string | null; description?: string | null }) {
    const info: forms_v1.Schema$Info = {};
    const mask: string[] = [];
    if (changes.title != null) {
      info.title = changes.title;
      mask.push("title");
    }
    if (changes.description != null) {
      info.description = changes.description;
      mask.push("description");
    }
    if (mask.length === 0) throw new Error("Nothing to change: give a title or description.");
    await this.forms.forms.batchUpdate({
      formId,
      requestBody: { requests: [{ updateFormInfo: { info, updateMask: mask.join(",") } }] },
    });
    return this.getForm(formId);
  }

  async setPublishState(formId: string, state: { isPublished: boolean; isAcceptingResponses: boolean }) {
    await this.forms.forms.setPublishSettings({
      formId,
      requestBody: {
        publishSettings: { publishState: state },
        updateMask: "publishState",
      },
    });
  }

  private async fetchResponses(formId: string, max: number) {
    const responses: forms_v1.Schema$FormResponse[] = [];
    let pageToken: string | undefined;
    do {
      const { data } = await this.forms.forms.responses.list({
        formId,
        pageSize: Math.min(5000, max - responses.length),
        pageToken,
      });
      responses.push(...(data.responses ?? []));
      pageToken = data.nextPageToken ?? undefined;
    } while (pageToken && responses.length < max);
    return responses;
  }

  /** Responses with each answer labelled by its question, newest first. */
  async listResponses(formId: string, limit = 20) {
    const [form, responses] = await Promise.all([this.getForm(formId), this.fetchResponses(formId, 1000)]);
    const sorted = responses.sort((a, b) => (b.lastSubmittedTime ?? "").localeCompare(a.lastSubmittedTime ?? ""));
    return {
      form,
      totalResponses: responses.length,
      responses: sorted.slice(0, limit).map((r) => ({
        responseId: r.responseId,
        submittedAt: r.lastSubmittedTime,
        respondentEmail: r.respondentEmail ?? null,
        answers: form.questions.map((q) => ({
          question: q.title,
          answer: q.questionId ? answerText(r.answers?.[q.questionId]) : "",
        })),
      })),
    };
  }

  /** Per-question results: counts for choice/scale/rating questions, a few samples for text. */
  async summarizeResponses(formId: string) {
    const [form, responses] = await Promise.all([this.getForm(formId), this.fetchResponses(formId, 5000)]);
    const questions = form.questions.map((q) => {
      const answers = responses
        .map((r) => (q.questionId ? r.answers?.[q.questionId]?.textAnswers?.answers ?? [] : []))
        .filter((a) => a.length > 0);
      const values = answers.flat().map((a) => a.value ?? "");
      const counted = ["multiple_choice", "checkboxes", "dropdown", "linear_scale", "rating"].includes(q.type);
      const numeric = values.map(Number).filter((n) => !Number.isNaN(n));
      return {
        question: q.title,
        type: q.type,
        answered: answers.length,
        ...(counted && {
          counts: values.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {}),
        }),
        ...((q.type === "linear_scale" || q.type === "rating") &&
          numeric.length > 0 && { average: Number((numeric.reduce((s, n) => s + n, 0) / numeric.length).toFixed(2)) }),
        ...(!counted && { samples: values.slice(0, 5) }),
      };
    });
    return { form, totalResponses: responses.length, questions };
  }

  async duplicateForm(formId: string, title: string) {
    const { data } = await this.drive.files.copy({
      fileId: formId,
      requestBody: { name: title },
      fields: "id",
    });
    await this.setPublishState(data.id!, { isPublished: true, isAcceptingResponses: true });
    return this.getForm(data.id!);
  }

  /** Moves the form to Drive trash; it can be restored from there for 30 days. */
  async trashForm(formId: string) {
    const form = await this.getForm(formId);
    await this.drive.files.update({ fileId: formId, requestBody: { trashed: true } });
    return form;
  }
}
