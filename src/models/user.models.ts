import {
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    avatarUrl: text("avatar_url")
      .notNull()
      .default("https://placehold.co/200x200"),
    avatarLocalPath: text("avatar_local_path").notNull().default(""),

    username: varchar("username", { length: 50 }).notNull(),
    email: varchar("email", { length: 100 }).notNull(),
    fullName: varchar("full_name", { length: 100 }).notNull(),
    password: text("password").notNull(),

    isEmailVerified: boolean("is_email_verified").notNull().default(false),

    refreshToken: text("refresh_token"),
    forgotPasswordToken: text("forgot_password_token"),
    forgotPasswordTokenExpiry: timestamp("forgot_password_token_expiry", {
      mode: "date",
    }),
    emailVerificationToken: text("email_verification_token"),
    emailVerificationExpiry: timestamp("email_verification_expiry", {
      mode: "date",
    }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    usernameIdx: uniqueIndex("username_idx").on(sql`lower(${table.username})`),
    emailIdx: uniqueIndex("email_idx").on(sql`lower(${table.email})`),
  }),
);
