import {
    pgTable,
    varchar,
    timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./user.models.ts";
import { workspaces } from "./workspace.models.ts";
import { WorkspaceInvitationStatus } from "../utils/constant.ts";

export const workspaceInvitations = pgTable("workspace_invitations", {
    id: varchar("id", { length: 36 })
        .primaryKey()
        .default(sql`gen_random_uuid()`),

    workspaceId: varchar("workspace_id", { length: 36 })
        .notNull()
        .references(() => workspaces.id),

    email: varchar("email", { length: 100 }).notNull(),

    role: varchar("role", { length: 10 })
        .notNull()
        .default("MEMBER"),

    invitedBy: varchar("invited_by", { length: 36 })
        .notNull()
        .references(() => users.id),

    status: varchar("status", { length: 10 })
        .notNull()
        .default(WorkspaceInvitationStatus.PENDING),

    createdAt: timestamp("created_at").notNull().defaultNow(),

    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});
