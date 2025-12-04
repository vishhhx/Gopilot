import express, { Application } from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import cors from "cors";
import { corsConfig } from "./utils";
import { authRouter } from "./routes";
import { connectionRouter } from "./routes/connetion";
import path from "path";
import { fileURLToPath } from "url";
import { Agentrouter } from "./routes/agent";
import { SesstionRouter } from "./routes/sesstion";
import testrouter from "./test.routes";
import workflowRouter from "./routes/workflow";
import { otherRouter } from "./routes/other";
const app: Application = express();
const httpServer = createServer(app);

app.use(cors(corsConfig));
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(cookieParser());
console.log(__dirname);
app.use("/public", express.static(path.join(__dirname, "public")));
app.get("/api/v1/health", (req, res) => {
  res.send("all cool and running well");
});
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/connection", connectionRouter);
app.use("/api/v1/agent", Agentrouter);
app.use("/api/v1/session", SesstionRouter);
app.use("/api", testrouter);
app.use("/api/v1/workflow", workflowRouter);
app.use("/api/v1/others",otherRouter)
export { httpServer };
