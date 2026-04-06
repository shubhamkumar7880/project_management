import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import type ApiError from "./utils/api-error.ts";

const app = express();

const corsOptions: CorsOptions = {
  origin: process.env.CORS_ORIGIN?.split(",") || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cors(corsOptions));
app.use(cookieParser());

import healthCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import workspaceRouter from "./routes/workspace.routes.js";
import projectRouter from "./routes/project.routes.js";

app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/workspaces", workspaceRouter);
app.use("/api/v1", projectRouter);
app.use((err: ApiError, req: Request, res: Response, next: NextFunction) => {
  res
    .status(err?.statusCode ?? 500)
    .json({ error: err.message ?? "Something went wrong" });
});
export default app;
