import {
    pgTable,
    varchar,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./user.models.ts";
import { workspaces } from "./workspace.models.ts";

export const workspaceMembers = pgTable(
    "workspace_members",
    {
        id: varchar("id", { length: 36 })
            .primaryKey()
            .default(sql`gen_random_uuid()`),

        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => users.id),

        workspaceId: varchar("workspace_id", { length: 36 })
            .notNull()
            .references(() => workspaces.id),

        role: varchar("role", { length: 10 })
            .notNull()
            .default("MEMBER"),

        joinedAt: timestamp("joined_at"),
    },
    (table) => ({
        userWorkspaceIdx: uniqueIndex("workspace_members_user_workspace_idx").on(
            table.userId,
            table.workspaceId
        ),
    })
);
