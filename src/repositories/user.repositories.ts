import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { users } from "../models/user.models.ts";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import crypto from "crypto";

export const findByEmail = async (email: string) => {
  return db.select().from(users).where(eq(users.email, email));
};

export const generateAccessToken = async (
  id: string,
  username: string,
  email: string,
) => {
  const secret: Secret | undefined = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("Access Token Secret environment variable is not defined");
  }

  const options: SignOptions = {
    expiresIn:
      (process.env.ACCESS_TOKEN_EXPIRY as SignOptions["expiresIn"]) || "1h",
  };

  return jwt.sign({ id, username, email }, secret, options);
};

export const generateRefreshToken = async (id: string) => {
  const secret: Secret | undefined = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    throw new Error("Refresh Token Secretenvironment variable is not defined");
  }

  const options: SignOptions = {
    expiresIn:
      (process.env.REFRESH_TOKEN_EXPIRY as SignOptions["expiresIn"]) || "1h",
  };

  return jwt.sign({ id }, secret, options);
};

export const generateTemporaryToken = () => {
  const unhashedToken = crypto.randomBytes(20).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(unhashedToken)
    .digest("hex");
  const tokenEXpiry = Date.now() + 1000 * 60 * 20;

  return { unhashedToken, hashedToken, tokenEXpiry };
};
