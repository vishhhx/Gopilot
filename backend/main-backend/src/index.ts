import dotenv from "dotenv";
import { setTracingDisabled } from "@openai/agents";
import { httpServer } from "./app";
import { SocketIo } from "./sockets";
import { connectDb, ConnectToQdrant, ConnectToRedis } from "./config";
import { failInterruptedRuns } from "./workflow/engine";
dotenv.config({});
// Agent traces (inputs, tool outputs, emails) are not uploaded to the OpenAI dashboard.
setTracingDisabled(true);
const startserver = async () => {
  const port = process.env.PORT;
  try {

    await ConnectToRedis();
    await SocketIo(httpServer);
    await connectDb();
    await ConnectToQdrant();
    await failInterruptedRuns();
    httpServer.listen(port, () => {
      console.log(`server is listening at the port ${port}`);
    });
  } catch (error) {
    console.error("failed to start server", error);
    process.exit(1);
  }
};

startserver();
