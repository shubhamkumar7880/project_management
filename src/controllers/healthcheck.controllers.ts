import type { Request, Response } from "express";
import ApiResponse from "../utils/api-respnse.js";
import asyncHandler from "../utils/async-handler.js";

const healthcheck = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(new ApiResponse(200, { message: "Server is running" }));
});

export default healthcheck;
