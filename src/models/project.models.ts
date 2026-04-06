import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./user.models.ts";
import { workspaces } from "./workspace.models.ts";
import {
  ProjectStatus,
  projectStatuses,
  projectTypes,
} from "../utils/constant.ts";

export const projectTypeEnum = pgEnum("project_type", projectTypes);
export const projectStatusEnum = pgEnum("project_status", projectStatuses);

export const projects = pgTable("projects", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  projectLogo: text("project_logo")
    .notNull()
    .default("https://placehold.co/200x200"),

  name: varchar("name", { length: 100 }).notNull(),

  description: text("description"),

  projectType: projectTypeEnum("project_type").notNull(),

  status: projectStatusEnum("status").notNull().default(ProjectStatus.ACTIVE),

  workspaceId: varchar("workspace_id", { length: 36 })
    .references(() => workspaces.id)
    .notNull(),

  createdBy: varchar("created_by", { length: 36 })
    .references(() => users.id)
    .notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
