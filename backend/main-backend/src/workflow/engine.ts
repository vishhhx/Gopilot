import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { Runner } from "@openai/agents";
import { z } from "zod";
import { PRIVATE_RUN_CONFIG } from "../agents/runConfig";
import type { InputField, WorkflowDocument } from "../models/workflow/workflow";
import { WorkflowRunModel, type Sealed, type WorkflowRunDocument } from "../models/workflow/workflowRun";
import { getServiceTokens, type ServiceToken } from "../services/serviceTokens";
import { decryptText, encryptText } from "../utils/crypto";
import { buildPlan, type PlanIssue } from "./plan";
import { findWorkflowAgent } from "./registry";

/*
  Runs a workflow step by step in the background. Progress lives in the WorkflowRun document, so the
  canvas can poll it, a Human review can wait as long as it likes (even across restarts), and the
  run continues from the same step once the user decides.

  Errors are caught at every step: an agent reports success, failure or a question for the user,
  and a failure stops the run there with the reason. No separate error node is needed.
*/

const runner = new Runner(PRIVATE_RUN_CONFIG);
const openai = new OpenAI();

const StepResultSchema = z.object({
  status: z.enum(["success", "failed", "needs_input"]),
  summary: z.string().describe("For the user, in Markdown: what you did and what you found, with names, dates and links."),
  data: z
    .string()
    .nullable()
    .describe("The exact values later steps may need (ids, email addresses, links, rows), as compact lines or JSON; null if none."),
  error: z.string().nullable().describe("If failed: why. If needs_input: the question for the user. Otherwise null."),
});
type StepResult = z.infer<typeof StepResultSchema>;

const VerdictSchema = z.object({
  pass: z.boolean(),
  reason: z.string().describe("One sentence explaining the decision."),
});
type Verdict = z.infer<typeof VerdictSchema>;

const STEP_OUTPUT_INSTRUCTIONS = `
WORKFLOW STEP OUTPUT (this replaces any response format described above):
- status "success" when your task is done.
- status "failed" when it can't be done: a tool error, missing access, or nothing to act on when something was required. Put the reason in error.
- status "needs_input" only when you need a specific piece of information that the run inputs and earlier results don't give you. Put the question in error.
- summary: Markdown for the user, with the concrete results.
- data: the exact values later steps may need, or null.
Never report success for something a tool did not confirm.`;

export class RunInputError extends Error {
  constructor(public issues: PlanIssue[]) {
    super(issues.map((i) => i.message).join(" "));
  }
}

const seal = (value: unknown): Sealed => encryptText(JSON.stringify(value));

export const unseal = <T>(sealed?: Sealed | null): T | null => {
  if (!sealed?.encrypted) return null;
  try {
    return JSON.parse(decryptText(sealed.encrypted, sealed.iv, sealed.tag)) as T;
  } catch {
    return null;
  }
};

export const fillTemplate = (text: string, inputs: Record<string, string>) =>
  text.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, key: string) => inputs[key] ?? match);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PICKED = new Set(["spreadsheet", "drive_file", "drive_folder", "form", "gmail_label", "calendar"]);

/** A Google id from a pasted link (docs.google.com/.../d/<id>, drive folders/<id>, ?id=<id>), else null. */
const idFromLink = (value: string) =>
  value.match(/\/(?:d|folders)\/([\w-]{10,})/)?.[1] ?? value.match(/[?&]id=([\w-]{10,})/)?.[1] ?? null;

/**
 * Checks one value against its field and turns it into the text the agents read. Returns the
 * formatted value, or an error message.
 */
const formatInput = (field: InputField, value: string): { value: string } | { error: string } => {
  const bad = (what: string) => ({ error: `"${field.label}" ${what}` });
  switch (field.type) {
    case "number":
      return Number.isNaN(Number(value)) ? bad("must be a number.") : { value };
    case "yes_no": {
      const v = value.toLowerCase();
      if (["yes", "true", "1"].includes(v)) return { value: "yes" };
      if (["no", "false", "0"].includes(v)) return { value: "no" };
      return bad("must be yes or no.");
    }
    case "select":
      return field.options?.length && !field.options.includes(value) ? bad(`must be one of: ${field.options.join(", ")}.`) : { value };
    case "date":
    case "datetime":
      return Number.isNaN(Date.parse(value)) ? bad("isn't a valid date.") : { value };
    case "time":
      return /^\d{1,2}:\d{2}/.test(value) ? { value } : bad("isn't a valid time.");
    case "email":
      return EMAIL.test(value) ? { value } : bad("isn't a valid email address.");
    case "email_list": {
      const emails = value.split(/[\s,;]+/).filter(Boolean);
      const wrong = emails.filter((e) => !EMAIL.test(e));
      return wrong.length ? bad(`has addresses that aren't valid: ${wrong.join(", ")}.`) : { value: emails.join(", ") };
    }
    case "url":
      return /^https?:\/\/\S+$/.test(value) ? { value } : bad("must be a link starting with http.");
    default:
      if (PICKED.has(field.type)) {
        // picked in the Run dialog as {"id","name"}, or pasted as a link or an id
        try {
          const picked = JSON.parse(value) as { id?: string; name?: string };
          if (picked?.id) return { value: `"${picked.name ?? picked.id}" (id: ${picked.id})` };
        } catch {
          /* not JSON */
        }
        const id = idFromLink(value);
        return { value: id ? `id: ${id}` : value };
      }
      return { value };
  }
};

/** Checks the values the user entered against the workflow's input fields. */
export const validateInputs = (fields: InputField[], raw: unknown) => {
  const given = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const values: Record<string, string> = {};
  const issues: PlanIssue[] = [];

  for (const field of fields) {
    const value = String(given[field.key] ?? "").trim();
    if (!value) {
      if (field.required) issues.push({ message: `Fill in "${field.label}".` });
      continue;
    }
    const result = formatInput(field, value);
    if ("error" in result) issues.push({ message: result.error });
    else values[field.key] = result.value;
  }
  return { values, issues };
};

const today = (timeZone: string) => {
  const now = new Date();
  const long = now.toLocaleDateString("en-GB", { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `${long} (${now.toLocaleDateString("en-CA", { timeZone })}), ${now.toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" })}`;
};

const describeError = (err: unknown) => {
  const e = err as { message?: string; name?: string };
  if (e?.name === "MaxTurnsExceededError") return "The agent took too many steps without finishing. Make its task more specific.";
  return e?.message || "Something went wrong in this step.";
};

/** Creates a run for the saved workflow and starts it in the background. */
export const startRun = async (
  workflow: WorkflowDocument,
  userId: string,
  rawInputs: unknown,
  timeZone: string
) => {
  const plan = buildPlan(workflow.nodes, workflow.edges);
  if (plan.errors.length) throw new RunInputError(plan.errors);
  const { values, issues } = validateInputs(workflow.inputs ?? [], rawInputs);
  if (issues.length) throw new RunInputError(issues);

  const run = await WorkflowRunModel.create({
    workflowId: workflow._id,
    userId,
    workflowTitle: workflow.title ?? "",
    status: "running",
    inputs: seal(values),
    timeZone,
    steps: plan.steps.map((s) => ({ ...s, status: "pending" })),
    currentStep: 0,
  });
  void advanceRun(run.id);
  return run;
};

const inFlight = new Set<string>();

/** Runs the remaining steps. Safe to call twice: a run already executing is left alone. */
export const advanceRun = async (runId: string) => {
  if (inFlight.has(runId)) return;
  inFlight.add(runId);
  try {
    await advance(runId);
  } catch (err) {
    console.error(`[workflow] run ${runId} crashed:`, err);
    await WorkflowRunModel.updateOne(
      { _id: runId, status: "running" },
      { $set: { status: "failed", error: describeError(err) } }
    );
  } finally {
    inFlight.delete(runId);
  }
};

const fail = async (run: WorkflowRunDocument, index: number, message: string) => {
  const step = run.steps[index];
  step.status = "failed";
  step.error = message;
  step.finishedAt = new Date();
  run.steps.slice(index + 1).forEach((s) => (s.status = "skipped"));
  run.status = "failed";
  run.error = `${step.label}: ${message}`;
  await run.save();
};

const advance = async (runId: string) => {
  const run = await WorkflowRunModel.findById(runId);
  if (!run || run.status !== "running") return;
  const inputs = unseal<Record<string, string>>(run.inputs) ?? {};
  const context = await getServiceTokens(run.userId.toString());

  for (let i = run.currentStep; i < run.steps.length; i++) {
    const step = run.steps[i];
    run.currentStep = i;
    step.status = "running";
    step.error = undefined;
    step.startedAt = new Date();
    await run.save();

    try {
      if (step.kind === "HIL") {
        step.status = "waiting";
        run.status = "waiting_for_review";
        await run.save();
        return;
      }

      if (step.kind === "Checker") {
        const verdict = await checkPreviousStep(run, i);
        step.result = seal(verdict);
        if (!verdict.pass) return fail(run, i, verdict.reason);
      }

      if (step.kind === "Agent") {
        const outcome = await runAgentStep(run, i, inputs, context);
        step.result = seal({ summary: outcome.summary, data: outcome.data });
        if (outcome.status === "failed") return fail(run, i, outcome.error || "The agent couldn't finish this step.");
        if (outcome.status === "needs_input") {
          step.status = "waiting";
          step.question = outcome.error || "The agent needs more information to continue.";
          step.note = undefined;
          run.status = "waiting_for_review";
          await run.save();
          return;
        }
      }

      step.status = "done";
      step.finishedAt = new Date();
      await run.save();
    } catch (err) {
      console.error(`[workflow] step ${step.label} failed:`, err);
      return fail(run, i, describeError(err));
    }
  }

  run.status = "completed";
  run.currentStep = run.steps.length;
  await run.save();
};

const runAgentStep = async (
  run: WorkflowRunDocument,
  index: number,
  inputs: Record<string, string>,
  context: ServiceToken[]
): Promise<StepResult> => {
  const step = run.steps[index];
  const known = findWorkflowAgent(step.agentName);
  if (!known) throw new Error(`"${step.agentName}" isn't an agent GoPilot can run.`);

  const base = typeof known.agent.instructions === "string" ? known.agent.instructions : "";
  // Only this step's job: no handoffs to other specialists, and a result the engine can check.
  const agent = known.agent.clone({
    instructions: `${base}\n${STEP_OUTPUT_INSTRUCTIONS}`,
    outputType: StepResultSchema,
    handoffs: [],
  });

  const result = await runner.run(agent, buildStepPrompt(run, index, inputs, known.description), {
    context,
    maxTurns: 15,
  });
  const output = result.finalOutput as StepResult | undefined;
  if (!output) throw new Error("The agent stopped without a result.");
  return output;
};

const buildStepPrompt = (run: WorkflowRunDocument, index: number, inputs: Record<string, string>, fallbackTask: string) => {
  const step = run.steps[index];
  const agentSteps = run.steps.filter((s) => s.kind === "Agent");
  const position = agentSteps.indexOf(step) + 1;
  const next = run.steps.slice(index + 1).find((s) => s.kind === "Agent");

  const earlier = run.steps
    .slice(0, index)
    .filter((s) => s.kind === "Agent" && s.status === "done")
    .map((s) => {
      const r = unseal<{ summary: string; data: string | null }>(s.result);
      return `### ${s.label}\n${r?.summary ?? ""}${r?.data ? `\nData: ${r.data}` : ""}`;
    });
  const notes = run.steps
    .slice(0, index)
    .filter((s) => s.kind === "HIL" && s.note)
    .map((s) => `- ${s.note}`);

  const inputLines = Object.entries(inputs).map(([key, value]) => `- ${key}: ${value}`);

  return [
    `You are step ${position} of ${agentSteps.length} in the workflow "${run.workflowTitle || "Untitled"}". Do only your step.`,
    `Today is ${today(run.timeZone)} in the user's timezone ${run.timeZone}.`,
    `YOUR TASK:\n${step.task ? fillTemplate(step.task, inputs) : `${fallbackTask}. Work out exactly what to do from the run inputs and earlier results.`}`,
    `RUN INPUTS:\n${inputLines.length ? inputLines.join("\n") : "None"}`,
    notes.length ? `NOTES FROM THE USER'S REVIEW:\n${notes.join("\n")}` : "",
    step.question && step.note ? `You asked the user: ${step.question}\nThey answered: ${step.note}` : "",
    `RESULTS FROM EARLIER STEPS:\n${earlier.length ? earlier.join("\n\n") : "None, you are the first step."}`,
    next ? `The next step is "${next.label}". Put everything it will need in data.` : "You are the last step.",
  ]
    .filter(Boolean)
    .join("\n\n");
};

/** A Checker passes when the agent before it succeeded and, if set, its condition holds. */
const checkPreviousStep = async (run: WorkflowRunDocument, index: number): Promise<Verdict> => {
  const step = run.steps[index];
  const previous = run.steps
    .slice(0, index)
    .reverse()
    .find((s) => s.kind === "Agent");
  if (!previous || previous.status !== "done") {
    return { pass: false, reason: "There's no finished agent step before this Checker." };
  }
  if (!step.condition) return { pass: true, reason: `${previous.label} finished successfully.` };

  const r = unseal<{ summary: string; data: string | null }>(previous.result);
  const response = await openai.responses.parse({
    model: "gpt-4o-mini",
    store: false,
    instructions:
      "You check one step of an automated workflow. Decide whether the step's result meets the condition. " +
      "Pass only if the result clearly shows the condition holds.",
    input: `Condition: ${step.condition}\n\nResult of "${previous.label}":\n${r?.summary ?? ""}${r?.data ? `\nData: ${r.data}` : ""}`,
    text: { format: zodTextFormat(VerdictSchema, "verdict") },
  });
  return response.output_parsed ?? { pass: false, reason: "The condition couldn't be checked." };
};

/** The user's decision on a run waiting at a Human review or an agent's question. */
export const reviewRun = async (run: WorkflowRunDocument, approved: boolean, note?: string) => {
  const step = run.steps[run.currentStep];
  if (run.status !== "waiting_for_review" || step?.status !== "waiting") {
    throw new RunInputError([{ message: "This run isn't waiting for you." }]);
  }
  const text = note?.trim() || undefined;

  if (!approved) {
    step.note = text;
    step.status = "failed";
    step.error = text ? `Rejected: ${text}` : "Rejected by you.";
    step.finishedAt = new Date();
    run.steps.slice(run.currentStep + 1).forEach((s) => (s.status = "skipped"));
    run.status = "rejected";
    run.error = `${step.label}: ${step.error}`;
    await run.save();
    return run;
  }

  if (step.kind === "Agent") {
    if (!text) throw new RunInputError([{ message: "Answer the agent's question to continue." }]);
    step.note = text;
    step.status = "pending";
  } else {
    step.note = text;
    step.status = "done";
    step.finishedAt = new Date();
    run.currentStep += 1;
  }
  run.status = "running";
  await run.save();
  void advanceRun(run.id);
  return run;
};

/** The run as the canvas shows it, with inputs and results decrypted. */
export const serializeRun = (run: WorkflowRunDocument) => ({
  id: run.id as string,
  workflowId: run.workflowId.toString(),
  workflowTitle: run.workflowTitle,
  status: run.status,
  currentStep: run.currentStep,
  error: run.error ?? null,
  inputs: unseal<Record<string, string>>(run.inputs) ?? {},
  createdAt: run.createdAt,
  updatedAt: run.updatedAt,
  steps: run.steps.map((s) => {
    const result = unseal<{ summary?: string; data?: string | null; pass?: boolean; reason?: string }>(s.result);
    return {
      nodeId: s.nodeId,
      kind: s.kind,
      label: s.label,
      service: s.service ?? null,
      agentName: s.agentName ?? null,
      task: s.task ?? null,
      condition: s.condition ?? null,
      message: s.message ?? null,
      status: s.status,
      summary: result?.summary ?? result?.reason ?? null,
      data: result?.data ?? null,
      error: s.error ?? null,
      note: s.note ?? null,
      question: s.question ?? null,
      startedAt: s.startedAt ?? null,
      finishedAt: s.finishedAt ?? null,
    };
  }),
});

/** Runs that were executing when the server stopped can't resume mid-step; mark them failed. */
export const failInterruptedRuns = async () => {
  const runs = await WorkflowRunModel.find({ status: "running" });
  for (const run of runs) {
    const index = Math.min(run.currentStep, run.steps.length - 1);
    if (index >= 0 && run.steps[index]) {
      await fail(run, index, "The server restarted during this step. Run the workflow again.");
    } else {
      run.status = "failed";
      run.error = "The server restarted during this run.";
      await run.save();
    }
  }
  if (runs.length) console.log(`[workflow] marked ${runs.length} interrupted run(s) as failed`);
};
