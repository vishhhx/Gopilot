import dotenv from "dotenv";
import { httpServer } from "./app";
import { SocketIo } from "./sockets";
import { connectDb, ConnectToRedis } from "./config";
dotenv.config({});
const startserver = async () => {
  const port = process.env.PORT;
  try {

    await ConnectToRedis();
    await SocketIo(httpServer);
    await connectDb();
    httpServer.listen(port, () => {
      console.log(`server is listening at the port ${port}`);
    });
  } catch (error) {}
};

startserver();
