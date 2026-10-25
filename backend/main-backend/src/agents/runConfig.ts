import type { RunConfig } from "@openai/agents";

// Nothing from agent runs is kept on OpenAI's side: no stored responses, no uploaded traces.
export const PRIVATE_RUN_CONFIG: Partial<RunConfig> = {
  modelSettings: { store: false },
  tracingDisabled: true,
};
