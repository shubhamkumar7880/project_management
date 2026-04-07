import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { projects } from "./project.models.ts";
import { users } from "./user.models.ts";

export const boards = pgTable(
  "boards",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    projectId: varchar("project_id", { length: 36 })
      .references(() => projects.id)
      .notNull(),

    name: varchar("name", { length: 100 }).notNull().default("Main Board"),

    description: text("description")
      .notNull()
      .default(
        "Define the structural phases of your project. Reorder stages by dragging the handles to align with your team's specific execution logic.",
      ),

    createdBy: varchar("created_by", { length: 36 })
      .references(() => users.id)
      .notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),

    updatedBy: varchar("updated_by", { length: 36 })
      .references(() => users.id)
      .notNull(),
  },
  (table) => ({
    projectIdIdx: uniqueIndex("boards_project_id_idx").on(table.projectId),
  }),
);
