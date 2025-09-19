import type { NextFunction } from "express";
import ApiError from "../utils/api-error.ts";
import jwt from "jsonwebtoken";
import { type RequestHandler } from "express";
import type { CustomRequest } from "../utils/types.ts";

export const verifyJWT: RequestHandler = (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
    (req as unknown as CustomRequest).user = decodedToken as {
      id: string;
      username: string;
      email: string;
    };
    next();
  } catch (error) {
    throw new ApiError(401, "Invalid token");
  }
};
