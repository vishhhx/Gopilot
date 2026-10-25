import { Request, Response } from "express";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { INPUT_FIELD_TYPES, type EdgeType, type NodeType } from "../models/workflow/workflow";
import { SERVICE_ICONS, WORKFLOW_AGENTS, findWorkflowAgent } from "../workflow/registry";

const openai = new OpenAI();

const agentNames = WORKFLOW_AGENTS.map((a) => a.name) as [string, ...string[]];

const GeneratedWorkflowSchema = z.object({
  feasible: z.boolean().describe("false if the available agents can't do this"),
  reason: z.string().nullable().describe("If not feasible: what's missing, in one sentence. Otherwise null."),
  title: z.string().describe("A short name for the workflow"),
  inputs: z
    .array(
      z.object({
        key: z.string().describe("snake_case, used as {{key}} in tasks"),
        label: z.string().describe("What the user is asked for, e.g. 'Recipient email'"),
        type: z.enum(INPUT_FIELD_TYPES),
        required: z.boolean(),
        description: z.string().nullable(),
        options: z.array(z.string()).nullable().describe("Choices when type is select, else null"),
      })
    )
    .max(8)
    .describe("Values the user fills in each time the workflow runs"),
  steps: z
    .array(
      z.object({
        agent: z.enum(agentNames),
        task: z.string().describe("Exactly what this step does. Refer to inputs as {{key}}."),
        check: z
          .string()
          .nullable()
          .describe("A condition to verify on this step's result before continuing (e.g. 'at least one email was found'), or null"),
        reviewBefore: z
          .boolean()
          .describe("Pause for the user's approval BEFORE this step runs. true for steps that send, share or delete."),
        reviewMessage: z
          .string()
          .nullable()
          .describe("When reviewBefore is true: what the user should check (the results so far, the recipient), else null"),
      })
    )
    .min(1)
    .max(8),
});
type GeneratedWorkflow = z.infer<typeof GeneratedWorkflowSchema>;

const INSTRUCTIONS = `You design automation workflows for GoPilot, which acts in the user's Google apps.
A workflow is a chain of steps that run in order. Each step is one agent with a precise task. Results of earlier steps are passed to later steps automatically.

AVAILABLE AGENTS:
${WORKFLOW_AGENTS.map((a) => `- ${a.name} (${a.service}): ${a.description}`).join("\n")}

RULES:
- Use the fewest steps that do the job, in the order they must happen. Pick the agent whose description fits each step.
- Inputs: anything that changes from run to run (a recipient, a date, a spreadsheet, a search term) becomes an input. Don't make inputs for things the agents can find themselves.
- Pick the most specific input type: spreadsheet, drive_file, drive_folder, form, gmail_label or calendar when the user should choose one of their own (shown as a picker); email_list for several recipients; datetime for a meeting start; yes_no for on/off choices; select (with options) for a fixed set of choices.
- Tasks must be specific and use {{key}} for inputs, e.g. "Send the summary to {{recipient_email}} with subject 'Weekly report'".
- Set reviewBefore true on a step that sends, shares or deletes, so the user approves before it happens. Never on read-only steps.
- Gmail sends immediately; there are no drafts. Write the email task as "Send ...".
- Add a check only when the next step makes no sense without it (e.g. "at least one invoice email was found").
- If the request needs something no agent can do, set feasible false and explain.`;

const NODE_SIZE = {
  Agent: { width: 248, height: 72 },
  Checker: { width: 132, height: 132 },
  HIL: { width: 248, height: 72 },
  Start: { width: 248, height: 72 },
  End: { width: 248, height: 72 },
} as const;

/** Lays the steps out left to right: Start, each agent (with its review before and check after), End. */
const buildCanvas = (wf: GeneratedWorkflow) => {
  const nodes: NodeType[] = [];
  const edges: EdgeType[] = [];
  let x = 0;

  const add = (type: keyof typeof NODE_SIZE, data: Record<string, unknown> = {}) => {
    const size = NODE_SIZE[type];
    const node: NodeType = {
      id: crypto.randomUUID(),
      type,
      position: { x, y: type === "Checker" ? -30 : 0 },
      data,
      measured: size,
      selected: false,
      dragging: false,
    };
    const previous = nodes[nodes.length - 1];
    if (previous) {
      edges.push({
        id: `e-${previous.id}-${node.id}`,
        source: previous.id,
        target: node.id,
        animated: true,
        ...(previous.type === "Checker" && { sourceHandle: "output" }),
      } as EdgeType);
    }
    nodes.push(node);
    x += size.width + 90;
  };

  add("Start");
  for (const step of wf.steps) {
    const agent = findWorkflowAgent(step.agent)!;
    if (step.reviewBefore) add("HIL", { message: step.reviewMessage ?? "" });
    add("Agent", {
      service: agent.service,
      svgpath: SERVICE_ICONS[agent.service],
      name: agent.name,
      description: agent.description,
      task: step.task,
    });
    // the model sometimes fills an unused check with punctuation instead of null
    const check = step.check?.trim();
    if (check && /[a-z]{3}/i.test(check)) add("Checker", { condition: check });
  }
  add("End");
  return { nodes, edges };
};

export const generateWorkflowFromPrompt = async (req: Request, res: Response): Promise<Response> => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  if (!prompt) {
    return res.status(400).json({ success: false, error: "Describe what the workflow should do." });
  }

  try {
    const response = await openai.responses.parse({
      model: "gpt-4.1",
      store: false,
      instructions: INSTRUCTIONS,
      input: prompt.slice(0, 4000),
      text: { format: zodTextFormat(GeneratedWorkflowSchema, "workflow") },
    });
    const wf = response.output_parsed;
    if (!wf) throw new Error("No workflow came back.");
    if (!wf.feasible) {
      return res.status(400).json({ success: false, error: wf.reason || "GoPilot's agents can't do that yet." });
    }

    const { nodes, edges } = buildCanvas(wf);
    return res.status(200).json({
      success: true,
      data: {
        title: wf.title,
        nodes,
        edges,
        inputs: wf.inputs.map(({ options, ...i }) => ({
          ...i,
          description: i.description ?? undefined,
          ...(i.type === "select" && options?.length ? { options } : {}),
        })),
        agentsUsed: wf.steps.map((s) => s.agent),
        metadata: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
        },
      },
    });
  } catch (error) {
    console.error("Error generating workflow:", error);
    return res.status(500).json({
      success: false,
      error: "GoPilot couldn't build that workflow. Try describing it another way.",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
