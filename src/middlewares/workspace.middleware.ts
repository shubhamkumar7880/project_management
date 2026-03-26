import type { RequestHandler } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { workspaces } from "../models/workspace.models.ts";
import { workspaceMembers } from "../models/workspaceMember.models.ts";
import ApiError from "../utils/api-error.ts";
import type { CustomRequest } from "../utils/types.ts";
import { WorkspaceRole } from "../utils/constant.ts";

export const verifyWorkspaceAdmin: RequestHandler = async (req, res, next) => {
    const currentUserId = (req as unknown as CustomRequest).user?.id;
    if (!currentUserId) {
        throw new ApiError(401, "Unauthorized request");
    }

    const { workspaceId } = req.params;
    if (!workspaceId) {
        throw new ApiError(400, "Workspace id is required");
    }

    const [workspace] = await db
        .select({
            id: workspaces.id,
            name: workspaces.name,
            description: workspaces.description,
            workspaceAvatar: workspaces.workspaceAvatar,
            createdBy: workspaces.createdBy,
            createdAt: workspaces.createdAt,
            updatedAt: workspaces.updatedAt,
        })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);

    if (!workspace) {
        throw new ApiError(404, "Workspace not found");
    }

    const [membership] = await db
        .select({
            id: workspaceMembers.id,
            role: workspaceMembers.role,
        })
        .from(workspaceMembers)
        .where(
            and(
                eq(workspaceMembers.workspaceId, workspaceId),
                eq(workspaceMembers.userId, currentUserId),
            ),
        )
        .limit(1);

    if (!membership) {
        throw new ApiError(403, "You do not belong to this workspace");
    }

    if (membership.role !== WorkspaceRole.ADMIN) {
        throw new ApiError(
            403,
            "Only workspace admins can edit or delete this workspace",
        );
    }

    (req as unknown as CustomRequest).workspace = workspace;
    next();
};
