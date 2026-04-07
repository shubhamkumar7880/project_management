import { v2 as cloudinary } from "cloudinary";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.ts";
import { boardColumns } from "../models/boardColumn.models.ts";
import { boards } from "../models/board.models.ts";
import { projectMembers } from "../models/projectMember.models.ts";
import { projects } from "../models/project.models.ts";
import { users } from "../models/user.models.ts";
import { workspaceMembers } from "../models/workspaceMember.models.ts";
import asyncHandler from "../utils/async-handler.ts";
import ApiError from "../utils/api-error.ts";
import ApiResponse from "../utils/api-respnse.ts";
import type { CustomRequest } from "../utils/types.ts";
import { WorkspaceRole } from "../utils/constant.ts";
import {
  addProjectMembersSchema,
  createProjectSchema,
} from "../validators/project.validators.ts";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

const createProject = asyncHandler(async (req, res) => {
  const currentUserId = (req as unknown as CustomRequest).user?.id;
  if (!currentUserId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { workspaceId } = req.params;
  if (!workspaceId) {
    throw new ApiError(400, "Workspace id is required");
  }

  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      errors: parsed.error.flatten().fieldErrors,
      formErrors: parsed.error.flatten().formErrors,
    });
  }

  const { name, description, projectType, status } = parsed.data;

  let projectLogo = "https://placehold.co/200x200";
  if (req.file) {
    try {
      const buffer = req.file.buffer;
      if (!buffer) {
        throw new ApiError(
          400,
          "Invalid project logo file upload: file buffer is missing",
        );
      }

      const dataUri = `data:${req.file.mimetype};base64,${buffer.toString("base64")}`;
      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: "project-logos",
        resource_type: "image",
      });
      projectLogo = uploadResult.secure_url;
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(400, "Failed to upload project logo. Please try again.");
    }
  }

  const createdProject = await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        name,
        description,
        projectType,
        status,
        workspaceId,
        createdBy: currentUserId,
        projectLogo,
      })
      .returning({
        id: projects.id,
        projectLogo: projects.projectLogo,
        name: projects.name,
        description: projects.description,
        projectType: projects.projectType,
        status: projects.status,
        workspaceId: projects.workspaceId,
        createdBy: projects.createdBy,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      });

    if (!project) {
      throw new ApiError(500, "Unable to create project");
    }

    const [board] = await tx
      .insert(boards)
      .values({
        projectId: project.id,
        createdBy: currentUserId,
        updatedBy: currentUserId,
      })
      .returning({
        id: boards.id,
      });

    if (!board) {
      throw new ApiError(500, "Unable to create project board");
    }

    await tx.insert(boardColumns).values([
      {
        boardId: board.id,
        name: "To Do",
        description: "Tasks has not started yet.",
        order: 0,
        createdBy: currentUserId,
        updatedBy: currentUserId,
      },
      {
        boardId: board.id,
        name: "In Progress",
        description: "Task started",
        order: 1,
        createdBy: currentUserId,
        updatedBy: currentUserId,
      },
      {
        boardId: board.id,
        name: "Done",
        description: "Task finished",
        order: 2,
        createdBy: currentUserId,
        updatedBy: currentUserId,
      },
    ]);

    await tx.insert(projectMembers).values({
      userId: currentUserId,
      projectId: project.id,
      addedBy: currentUserId,
    });

    return project;
  });

  if (!createdProject) {
    throw new ApiError(500, "Unable to create project");
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        project: createdProject,
      },
      "Project created successfully",
    ),
  );
});

const addProjectMembers = asyncHandler(async (req, res) => {
  const currentUserId = (req as unknown as CustomRequest).user?.id;
  if (!currentUserId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { projectId } = req.params;
  if (!projectId) {
    throw new ApiError(400, "Project id is required");
  }

  const parsed = addProjectMembersSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      errors: parsed.error.flatten().fieldErrors,
      formErrors: parsed.error.flatten().formErrors,
    });
  }

  const normalizedUserIds = [...new Set(parsed.data.userIds)];
  const targetUsers =
    normalizedUserIds.length > 0
      ? await db
          .select({
            id: users.id,
            email: users.email,
          })
          .from(users)
          .where(inArray(users.id, normalizedUserIds))
      : [];

  const userEmailById = new Map(
    targetUsers.map((user) => [user.id, user.email]),
  );

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

  const [actingMembership] = await db
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

  if (!actingMembership) {
    throw new ApiError(403, "You do not belong to this workspace");
  }

  if (actingMembership.role !== WorkspaceRole.ADMIN) {
    throw new ApiError(
      403,
      "Only workspace admins can add members to this project",
    );
  }

  const workspaceMemberships = await db
    .select({
      userId: workspaceMembers.userId,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, project.workspaceId),
        inArray(workspaceMembers.userId, normalizedUserIds),
      ),
    );

  const workspaceUserIds = new Set(
    workspaceMemberships.map((membership) => membership.userId),
  );

  const skipped: Array<{ email: string; reason: string }> = [];
  const eligibleUserIds = normalizedUserIds.filter((userId) => {
    const belongsToWorkspace = workspaceUserIds.has(userId);

    if (!belongsToWorkspace) {
      skipped.push({
        email: userEmailById.get(userId) ?? userId,
        reason: "User does not belong to the same workspace. Only workspace members can be added to this project",
      });
    }

    return belongsToWorkspace;
  });

  const existingProjectMemberships =
    eligibleUserIds.length > 0
      ? await db
        .select({
          userId: projectMembers.userId,
        })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            inArray(projectMembers.userId, eligibleUserIds),
          ),
        )
      : [];

  const existingProjectUserIds = new Set(
    existingProjectMemberships.map((membership) => membership.userId),
  );

  const userIdsToAdd = eligibleUserIds.filter((userId) => {
    const isAlreadyProjectMember = existingProjectUserIds.has(userId);

    if (isAlreadyProjectMember) {
      skipped.push({
        email: userEmailById.get(userId) ?? userId,
        reason: "User is already a member of this project",
      });
    }

    return !isAlreadyProjectMember;
  });

  if (userIdsToAdd.length === 0) {
    throw new ApiError(
      409,
      skipped.length > 0
        ? skipped.map((entry) => `${entry.email}: ${entry.reason}`).join(", ")
        : "No valid users found to add to the project",
    );
  }

  await db.insert(projectMembers).values(
    userIdsToAdd.map((userId) => ({
      userId,
      projectId,
      addedBy: currentUserId,
    })),
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        projectId: project.id,
        projectName: project.name,
        addedEmails: userIdsToAdd.map(
          (userId) => userEmailById.get(userId) ?? userId,
        ),
        skipped,
      },
      "Project members added successfully",
    ),
  );
});

export { createProject, addProjectMembers };
