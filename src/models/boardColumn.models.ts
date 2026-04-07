import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { boards } from "./board.models.ts";
import { users } from "./user.models.ts";

export const boardColumns = pgTable("board_columns", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  boardId: varchar("board_id", { length: 36 })
    .references(() => boards.id)
    .notNull(),

  name: varchar("name", { length: 100 }).notNull(),

  description: text("description"),

  order: integer("order").notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),

  createdBy: varchar("created_by", { length: 36 })
    .references(() => users.id)
    .notNull(),

  updatedBy: varchar("updated_by", { length: 36 })
    .references(() => users.id)
    .notNull(),
});
