import { sql } from "drizzle-orm";
import {
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { projects } from "./project.models.ts";
import { users } from "./user.models.ts";

export const projectLabels = pgTable(
  "project_labels",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    projectId: varchar("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id),

    name: varchar("name", { length: 100 }).notNull(),

    createdBy: varchar("created_by", { length: 36 })
      .notNull()
      .references(() => users.id),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    projectNameIdx: uniqueIndex("project_labels_project_name_idx").on(
      table.projectId,
      table.name,
    ),
  }),
);
