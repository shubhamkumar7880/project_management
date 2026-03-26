import {
    pgTable,
    varchar,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const workspaces = pgTable(
    "workspaces",
    {
        id: varchar("id", { length: 36 })
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        name: varchar("name", { length: 100 }).notNull(),

        workspaceAvatar: text("workspace_avatar")
            .notNull()
            .default("https://placehold.co/200x200"),

        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (table) => ({
        nameIdx: uniqueIndex("workspace_name_idx").on(sql`lower(${table.name})`),
    }),
);
