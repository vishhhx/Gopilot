import { createContext, useContext } from "react";
import type { InputField, StepStatus } from "@/lib/workflow";

export interface NodeStatus {
  /** the node's step in the run being shown */
  run?: StepStatus;
  /** why the workflow can't run because of this node, or why it will be skipped */
  issue?: string;
}

/**
 * Status by node id. Kept out of node data so live run updates don't mark the workflow as changed
 * and trigger a save.
 */
export const NodeStatusContext = createContext<Record<string, NodeStatus>>({});

export const useNodeStatus = (id: string) => useContext(NodeStatusContext)[id];

/** The workflow's input fields, so nodes can show a task's inputs by name. */
export const WorkflowInputsContext = createContext<InputField[]>([]);

export const useWorkflowInputs = () => useContext(WorkflowInputsContext);
