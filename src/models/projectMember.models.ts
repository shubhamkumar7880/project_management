import {
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./user.models.ts";
import { projects } from "./project.models.ts";

export const projectMembers = pgTable(
  "project_members",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id),

    projectId: varchar("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id),

    addedBy: varchar("added_by", { length: 36 })
      .notNull()
      .references(() => users.id),

    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (table) => ({
    userProjectIdx: uniqueIndex("project_members_user_project_idx").on(
      table.userId,
      table.projectId,
    ),
  }),
);
