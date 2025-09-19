import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "../models/user.models.js";
import { z } from "zod";

export const insertUserSchema = createInsertSchema(users, {
  username: (field) =>
    field
      .min(3)
      .max(50)
      .transform((val) => val.trim().toLowerCase()),
  email: (field) => field.email().transform((val) => val.trim().toLowerCase()),
  fullName: (field) => field.min(1).transform((val) => val.trim()),
  password: (field) => field.min(6),
});

export const selectUserSchema = createSelectSchema(users);

export const loginUserSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username must be at most 50 characters")
      .transform((val) => val.trim().toLowerCase())
      .optional(),
    email: z
      .string()
      .email("Invalid email")
      .transform((val) => val.trim().toLowerCase())
      .optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.username || data.email, {
    message: "Either username or email is required",
    path: ["username"],
  });
