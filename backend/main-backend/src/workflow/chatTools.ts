import { tool } from "@openai/agents";
import { z } from "zod";
import { WorkflowModel } from "../models/workflow/workflow";
import { DynamicContentType } from "../models/chat/chatSession";
import { RunInputError, startRun } from "./engine";
import { buildPlan } from "./plan";

/**
 * Tools that let the chat orchestrator run the user's saved workflows when asked in words.
 * Built per request so they act for that user only.
 */
export const workflowChatTools = (userId: string, timeZone: string) => [
  tool({
    name: "list_my_workflows",
    description: "List the user's saved workflows with their inputs and steps. Call before run_workflow.",
    parameters: z.object({}),
    execute: async () => {
      const workflows = await WorkflowModel.find({ userId, isDeleted: false }).sort({ updatedAt: -1 }).limit(50).lean();
      return workflows.map((wf) => ({
        workflowId: String(wf._id),
        title: wf.title ?? "Untitled workflow",
        description: wf.description ?? "",
        inputs: (wf.inputs ?? []).map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          ...(f.options?.length ? { options: f.options } : {}),
        })),
        steps: buildPlan(wf.nodes, wf.edges).steps.map((s) => s.label),
      }));
    },
  }),
  tool({
    name: "run_workflow",
    description:
      "Start one of the user's saved workflows with its inputs filled in. It runs in the background and shows a live card in the chat.",
    parameters: z.object({
      workflowId: z.string().describe("From list_my_workflows"),
      inputs: z
        .array(z.object({ key: z.string(), value: z.string() }))
        .describe("One entry per input you can fill. Dates as YYYY-MM-DD, times as HH:MM, several emails comma-separated."),
    }),
    execute: async ({ workflowId, inputs }) => {
      const workflow = await WorkflowModel.findOne({ _id: workflowId, userId, isDeleted: false }).catch(() => null);
      if (!workflow) return { started: false, error: "No workflow with that id. Call list_my_workflows." };
      try {
        const run = await startRun(
          workflow,
          userId,
          Object.fromEntries(inputs.map((i) => [i.key, i.value])),
          timeZone
        );
        return {
          started: true,
          message: `"${workflow.title}" is running. Its progress shows in the card below.`,
          // picked up by the chat controller and shown as the live workflow card
          dynamicContent: [
            {
              type: DynamicContentType.WORKFLOW,
              title: workflow.title || "Untitled workflow",
              url: `/workflow/${workflow.id}`,
              metadata: { runId: run.id, workflowId: workflow.id, operation: "started" },
            },
          ],
        };
      } catch (err) {
        if (err instanceof RunInputError) {
          return { started: false, error: `Can't start yet: ${err.message} Ask the user for what's missing.` };
        }
        throw err;
      }
    },
  }),
];
