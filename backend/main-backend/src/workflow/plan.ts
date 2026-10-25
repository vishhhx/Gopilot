import type { EdgeType, NodeType } from "../models/workflow/workflow";
import { findWorkflowAgent } from "./registry";
import type { StepKind } from "../models/workflow/workflowRun";

export interface PlanStep {
  nodeId: string;
  kind: StepKind;
  label: string;
  service?: string;
  agentName?: string;
  /** Agent: what this step should do; may use {{inputKey}} */
  task?: string;
  /** Checker: an optional condition the previous step's result must meet */
  condition?: string;
  /** Human review: what the reviewer should look at */
  message?: string;
}

export interface PlanIssue {
  nodeId?: string;
  message: string;
}

export interface Plan {
  steps: PlanStep[];
  errors: PlanIssue[];
  warnings: PlanIssue[];
}

const humanize = (name = "") =>
  name
    .replace(/Agent$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase());

/**
 * Walks the canvas from Start and returns the steps in the order they run.
 *
 * Steps run one after another: every node connects to one next node. Two older layouts still work:
 * Error nodes are ignored (errors are now caught at every step), and a Human review node that hangs
 * off a Checker with nothing after it runs right after that Checker.
 */
export const buildPlan = (nodes: NodeType[], edges: EdgeType[]): Plan => {
  const errors: PlanIssue[] = [];
  const warnings: PlanIssue[] = [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const outgoing = (id: string) =>
    edges.filter((e) => e.source === id && byId.has(e.target) && byId.get(e.target)!.type !== "Error");

  const starts = nodes.filter((n) => n.type === "Start");
  if (starts.length === 0) return { steps: [], errors: [{ message: "Add a Start node." }], warnings };
  if (starts.length > 1) errors.push({ nodeId: starts[1].id, message: "A workflow can have only one Start node." });

  const path: NodeType[] = [];
  const visited = new Set<string>();
  let current: NodeType | undefined = starts[0];

  while (current) {
    if (visited.has(current.id)) {
      errors.push({ nodeId: current.id, message: "The steps loop back on themselves. Remove the connection that goes backwards." });
      break;
    }
    visited.add(current.id);
    path.push(current);
    if (current.type === "End") break;

    const outs = outgoing(current.id);
    const sideReview = outs.find((e) => byId.get(e.target)!.type === "HIL" && outgoing(e.target).length === 0);
    const next = outs.filter((e) => e !== sideReview);

    if (sideReview && next.length > 0) {
      const review = byId.get(sideReview.target)!;
      visited.add(review.id);
      path.push(review);
    }
    if (next.length > 1) {
      errors.push({
        nodeId: current.id,
        message: "This step connects to more than one next step. Steps run one at a time; keep a single connection out.",
      });
      break;
    }
    const nextEdge = next[0] ?? sideReview;
    current = nextEdge ? byId.get(nextEdge.target) : undefined;
  }

  if (path.length === 1) errors.push({ nodeId: starts[0].id, message: "Connect the Start node to the first step." });

  const steps: PlanStep[] = [];
  for (const node of path) {
    const data = (node.data ?? {}) as Record<string, any>;
    if (node.type === "Agent") {
      const known = findWorkflowAgent(data.name);
      if (!known) {
        errors.push({ nodeId: node.id, message: `"${data.name || "This agent"}" isn't an agent GoPilot can run.` });
        continue;
      }
      steps.push({
        nodeId: node.id,
        kind: "Agent",
        label: humanize(known.name),
        service: known.service,
        agentName: known.name,
        task: typeof data.task === "string" && data.task.trim() ? data.task.trim() : undefined,
      });
    } else if (node.type === "Checker") {
      steps.push({
        nodeId: node.id,
        kind: "Checker",
        label: "Checker",
        condition: typeof data.condition === "string" && data.condition.trim() ? data.condition.trim() : undefined,
      });
    } else if (node.type === "HIL") {
      steps.push({
        nodeId: node.id,
        kind: "HIL",
        label: "Human review",
        message: typeof data.message === "string" && data.message.trim() ? data.message.trim() : undefined,
      });
    }
  }

  if (!steps.some((s) => s.kind === "Agent")) errors.push({ message: "Add at least one agent between Start and End." });
  if (steps[0]?.kind === "Checker") errors.push({ nodeId: steps[0].nodeId, message: "A Checker needs an agent before it to check." });

  for (const node of nodes) {
    if (!visited.has(node.id) && node.type !== "Error" && node.type !== "End") {
      warnings.push({ nodeId: node.id, message: "Not connected to the run, so it will be skipped." });
    }
  }

  return { steps, errors, warnings };
};
