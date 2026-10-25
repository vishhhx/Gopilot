import type { Edge, Node } from "@xyflow/react";
import { axiosInstance } from "@/utils";

export interface HubWorkflow {
  _id: string;
  uploader?: { _id: string; name?: string; email?: string };
  title?: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  /** example prompts; the backend spells the field this way */
  promts?: string[];
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Copies a Hub workflow into the signed-in user's workspace and returns the new workflow's id, if sent. */
export async function copyHubWorkflow(id: string): Promise<string | undefined> {
  const { data } = await axiosInstance.post(`/hub/copy/${id}`, {});
  const wf = data?.data?.workflow ?? data?.data;
  return wf?._id;
}
