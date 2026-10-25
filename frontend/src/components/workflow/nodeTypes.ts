import AgentNode from "./nodes/AgentNode";
import CheckerNode from "./nodes/CheckerNode";
import EndNode from "./nodes/EndNode";
import ErrorHandlerNode from "./nodes/ErrorHandlerNode";
import HumanInLoopNode from "./nodes/HumanInLoopNode";
import StartNode from "./nodes/StartNode";

/** Node renderers by the `type` the backend stores. Shared by the builder and the Hub preview. */
export const nodeTypes = {
  Start: StartNode,
  Agent: AgentNode,
  Checker: CheckerNode,
  Error: ErrorHandlerNode,
  HIL: HumanInLoopNode,
  End: EndNode,
};
