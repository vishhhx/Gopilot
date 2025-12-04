// workflowController.ts
import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "../config";

// ============= TYPES =============
export interface EdgeType {
  id?: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  label?: string;
  sourceHandle?: string;
  data?: any;
}

export interface NodeType {
  id: string;
  type?: "Checker" | "Error" | "HIL" | "Start" | "End" | "Agent";
  position?: { x: number; y: number };
  data?: any;
  measured?: { width?: number; height?: number } | null;
  selected?: boolean;
  dragging?: boolean;
}

interface Workflow {
  title?: string;
  updatedAt?: string;
  nodes: NodeType[];
  edges: EdgeType[];
}

type AgentDetail = {
  name: string;
  description: string;
};

type ServiceItem = {
  type: "Agent";
  service: string;
  name: string;
  svgpath?: string;
  agents: AgentDetail[];
};

type NodeTypeString = "Checker" | "Error" | "HIL" | "Start" | "End";

type OtherItem = {
  type: NodeTypeString;
  data: Record<string, any>;
  description?: string;
};

type Category = {
  id?: string;
  name: string;
  items: (ServiceItem | OtherItem)[];
};

interface GenerateWorkflowRequest {
  prompt: string;
}

interface AIResponse {
  agents: string[];
  error: string | null;
}

// ============= DATA =============
const availableAgents: Record<string, AgentDetail[]> = {
  gmail: [
    { name: "gmailReaderAgent", description: "Read emails" },
    { name: "gmailWriterAgent", description: "Send emails" },
    { name: "gmailDeleteAgent", description: "Delete emails" },
    { name: "gmailTrashAgent", description: "Move emails to trash" },
  ],
  sheets: [
    { name: "sheetsReaderAgent", description: "Read Google Sheets content" },
    { name: "sheetsWriterAgent", description: "Write values into Sheets" },
    {
      name: "sheetsFormattingAgent",
      description: "Apply formatting to Sheets",
    },
    {
      name: "sheetsHelperAgent",
      description: "Provide helper functions for Sheets",
    },
    {
      name: "sheetsManagementAgent",
      description: "Manage sheet tabs and structure",
    },
    {
      name: "sheetsStructureAgent",
      description: "Modify rows, columns and layout",
    },
  ],
};

const data: Category[] = [
  {
    name: "agents",
    id: "agents",
    items: [
      {
        type: "Agent",
        service: "gmail",
        name: "gmail-agents",
        svgpath: "/public/icons/Gmail.svg",
        agents: availableAgents.gmail,
      },
      {
        type: "Agent",
        service: "sheets",
        name: "sheets-agents",
        svgpath: "/public/icons/Sheets.svg",
        agents: availableAgents.sheets,
      },
    ],
  },
  {
    id: "Logic",
    name: "others",
    items: [
      { type: "Start", data: {}, description: "Start point" },
      { type: "Checker", data: {}, description: "Conditional logic" },
      { type: "Error", data: {}, description: "Error handling" },
      { type: "HIL", data: {}, description: "Human approval" },
      { type: "End", data: {}, description: "End point" },
    ],
  },
];

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY || "");

// ============= HELPER FUNCTIONS =============

const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const createNode = (
  type: "Checker" | "Error" | "HIL" | "Start" | "End" | "Agent",
  data: Record<string, any> = {},
  position: { x: number; y: number } = { x: 0, y: 0 }
): NodeType => {
  const measured =
    type === "Checker"
      ? { width: 160, height: 160 }
      : type === "Error" || type === "HIL"
      ? { width: 224, height: 140 }
      : { width: 224, height: 124 };

  return {
    id: generateUUID(),
    type,
    position,
    data,
    measured,
    selected: false,
    dragging: false,
  };
};

const createEdge = (
  source: string,
  target: string,
  sourceHandle: string | null = null
): EdgeType => {
  const edgeId = sourceHandle
    ? `xy-edge__${source}${sourceHandle}-${target}`
    : `xy-edge__${source}-${target}`;

  return {
    id: edgeId,
    source,
    target,
    ...(sourceHandle && { sourceHandle }),
    animated: true,
  };
};

const validateAgents = (agentNames: string[]): string[] => {
  const allAgents = [...availableAgents.gmail, ...availableAgents.sheets];
  const invalidAgents: string[] = [];

  for (const agentName of agentNames) {
    const exists = allAgents.some((a) => a.name === agentName);
    if (!exists) {
      invalidAgents.push(agentName);
    }
  }

  return invalidAgents;
};

const generateWorkflowStructure = (agentNames: string[]): Workflow => {
  const allAgents = [...availableAgents.gmail, ...availableAgents.sheets];
  const nodes: NodeType[] = [];
  const edges: EdgeType[] = [];
  let yPos = 100;
  const xSpacing = 300;
  const ySpacing = 300;

  // Start node
  const startNode = createNode("Start", {}, { x: 100, y: yPos });
  nodes.push(startNode);
  yPos += ySpacing;

  let previousNode = startNode;

  // Generate agent -> checker -> (HIL, Error, next) pattern
  for (let i = 0; i < agentNames.length; i++) {
    const agentName = agentNames[i];
    const agentData = allAgents.find((a) => a.name === agentName);

    if (!agentData) continue;

    // Determine service
    const service = availableAgents.gmail.some((a) => a.name === agentName)
      ? "gmail"
      : "sheets";

    // Create Agent node
    const agentNode = createNode(
      "Agent",
      {
        service,
        svgpath: `/public/icons/${
          service === "gmail" ? "Gmail" : "Sheets"
        }.svg`,
        name: agentData.name,
        description: agentData.description,
      },
      { x: 100, y: yPos }
    );
    nodes.push(agentNode);
    edges.push(createEdge(previousNode.id, agentNode.id));
    yPos += ySpacing;

    // Create Checker node
    const checkerNode = createNode("Checker", {}, { x: 100, y: yPos });
    nodes.push(checkerNode);
    edges.push(createEdge(agentNode.id, checkerNode.id));

    // Create HIL node (left)
    const hilNode = createNode(
      "HIL",
      {},
      { x: 100 - xSpacing, y: yPos + ySpacing }
    );
    nodes.push(hilNode);
    edges.push(createEdge(checkerNode.id, hilNode.id, "output"));

    // Create Error node (right)
    const errorNode = createNode(
      "Error",
      {},
      { x: 100 + xSpacing, y: yPos + ySpacing }
    );
    nodes.push(errorNode);
    edges.push(createEdge(checkerNode.id, errorNode.id, "output"));

    yPos += ySpacing * 2;

    // Determine next node (another agent or end)
    if (i < agentNames.length - 1) {
      // More agents to come, checker connects to next agent
      previousNode = checkerNode;
    } else {
      // Last agent, create End node
      const endNode = createNode("End", {}, { x: 100, y: yPos });
      nodes.push(endNode);
      edges.push(createEdge(checkerNode.id, endNode.id, "output"));
    }
  }

  return { nodes, edges };
};

// ============= CONTROLLERS =============

export const generateWorkflowFromPrompt = async (
  req: Request<{}, {}, GenerateWorkflowRequest>,
  res: Response
): Promise<Response> => {
  try {
    const { prompt } = req.body;

    if (!prompt || prompt.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Prompt is required",
      });
    }

    // Create Gemini AI prompt
    const allAgentsList = Object.entries(availableAgents)
      .map(
        ([service, agents]) =>
          `${service}: ${agents.map((a) => a.name).join(", ")}`
      )
      .join("\n");

    const systemPrompt = `You are a workflow generator. Based on the user's request, generate a workflow following these STRICT rules:

1. MUST start with a Start node
2. MUST end with an End node
3. After Start, connect to an Agent node
4. After EVERY Agent node, connect to a Checker node
5. From EVERY Checker node, connect to exactly 3 nodes:
   - One HIL (Human in Loop) node
   - One Error node
   - One more node (either another Agent or End node)
6. The Checker uses "output" as sourceHandle for all connections
7. If user requests agents that don't exist, return an error

Available agents:
${allAgentsList}

Respond ONLY with valid JSON in this exact format (no markdown, no backticks, just raw JSON):
{
  "agents": ["agentName1", "agentName2"],
  "error": null
}

OR if agents don't exist:
{
  "agents": [],
  "error": "Agent X not found. Available agents are: ..."
}

User request: ${prompt}`;

    // Call Gemini AI
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();

    // Parse AI response
    let parsedResponse: AIResponse;
    try {
      // Clean the response (remove markdown code blocks if present)
      const cleanedText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsedResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", text);
      return res.status(500).json({
        success: false,
        error: "Failed to parse AI response",
        details: text,
      });
    }

    // Check if AI returned an error
    if (parsedResponse.error) {
      return res.status(400).json({
        success: false,
        error: parsedResponse.error,
      });
    }

    // Validate agents
    const invalidAgents = validateAgents(parsedResponse.agents);
    if (invalidAgents.length > 0) {
      const allAgents = [...availableAgents.gmail, ...availableAgents.sheets];
      return res.status(400).json({
        success: false,
        error: `Invalid agents: ${invalidAgents.join(
          ", "
        )}. Available agents: ${allAgents.map((a) => a.name).join(", ")}`,
      });
    }

    // Generate workflow structure
    const workflow = generateWorkflowStructure(parsedResponse.agents);

    // Return successful response
    return res.status(200).json({
      success: true,
      data: {
        nodes: workflow.nodes,
        edges: workflow.edges,
        agentsUsed: parsedResponse.agents,
        metadata: {
          totalNodes: workflow.nodes.length,
          totalEdges: workflow.edges.length,
          nodeTypes: workflow.nodes.reduce((acc, node) => {
            const type = node.type || "Unknown";
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
      },
    });
  } catch (error) {
    console.error("Error generating workflow:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getAvailableAgents = (req: Request, res: Response): Response => {
  try {
    const allAgents = Object.entries(availableAgents).map(
      ([service, agents]) => ({
        service,
        agents,
      })
    );

    return res.status(200).json({
      success: true,
      data: allAgents,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch available agents",
    });
  }
};

export const validateWorkflow = (
  req: Request<{}, {}, { nodes: NodeType[]; edges: EdgeType[] }>,
  res: Response
): Response => {
  try {
    const { nodes, edges } = req.body;

    if (!nodes || !Array.isArray(nodes)) {
      return res.status(400).json({
        success: false,
        error: "Nodes array is required",
      });
    }

    if (!edges || !Array.isArray(edges)) {
      return res.status(400).json({
        success: false,
        error: "Edges array is required",
      });
    }

    const validationResults = {
      hasStart: nodes.some((n) => n.type === "Start"),
      hasEnd: nodes.some((n) => n.type === "End"),
      agentFollowedByChecker: true,
      checkerHasThreeOutputs: true,
      errors: [] as string[],
    };

    // Check if Start exists
    if (!validationResults.hasStart) {
      validationResults.errors.push("Workflow must have a Start node");
    }

    // Check if End exists
    if (!validationResults.hasEnd) {
      validationResults.errors.push("Workflow must have an End node");
    }

    // Check if every Agent is followed by a Checker
    const agentNodes = nodes.filter((n) => n.type === "Agent");
    for (const agent of agentNodes) {
      const connectedEdge = edges.find((e) => e.source === agent.id);
      if (connectedEdge) {
        const targetNode = nodes.find((n) => n.id === connectedEdge.target);
        if (!targetNode || targetNode.type !== "Checker") {
          validationResults.agentFollowedByChecker = false;
          validationResults.errors.push(
            `Agent ${
              agent.data?.name || agent.id
            } must be followed by a Checker node`
          );
        }
      }
    }

    // Check if every Checker has exactly 3 outputs
    const checkerNodes = nodes.filter((n) => n.type === "Checker");
    for (const checker of checkerNodes) {
      const outgoingEdges = edges.filter((e) => e.source === checker.id);
      if (outgoingEdges.length !== 3) {
        validationResults.checkerHasThreeOutputs = false;
        validationResults.errors.push(
          `Checker node must have exactly 3 outputs (has ${outgoingEdges.length})`
        );
      }
    }

    const isValid = validationResults.errors.length === 0;

    return res.status(200).json({
      success: true,
      data: {
        isValid,
        ...validationResults,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Validation failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
