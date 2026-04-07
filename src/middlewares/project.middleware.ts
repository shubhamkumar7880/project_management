import type { RequestHandler } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { projectMembers } from "../models/projectMember.models.ts";
import { projects } from "../models/project.models.ts";
import { workspaceMembers } from "../models/workspaceMember.models.ts";
import ApiError from "../utils/api-error.ts";
import { WorkspaceRole } from "../utils/constant.ts";
import type { CustomRequest } from "../utils/types.ts";

export const verifyProjectAdmin: RequestHandler = async (req, res, next) => {
  const currentUserId = (req as unknown as CustomRequest).user?.id;
  if (!currentUserId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { projectId } = req.params;
  if (!projectId) {
    throw new ApiError(400, "Project id is required");
  }

  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      workspaceId: projects.workspaceId,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const [projectMembership] = await db
    .select({
      id: projectMembers.id,
    })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, currentUserId),
      ),
    )
    .limit(1);

  if (!projectMembership) {
    throw new ApiError(403, "You do not belong to this project");
  }

  const [workspaceMembership] = await db
    .select({
      id: workspaceMembers.id,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, project.workspaceId),
        eq(workspaceMembers.userId, currentUserId),
      ),
    )
    .limit(1);

  if (!workspaceMembership) {
    throw new ApiError(403, "You do not belong to this workspace");
  }

  if (workspaceMembership.role !== WorkspaceRole.ADMIN) {
    throw new ApiError(
      403,
      "Only project members with admin access can add members to this project",
    );
  }

  (req as unknown as CustomRequest).project = project;
  next();
};
