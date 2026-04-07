import { v2 as cloudinary } from "cloudinary";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "../db/index.ts";
import { boardColumns } from "../models/boardColumn.models.ts";
import { boards } from "../models/board.models.ts";
import { projectLabels } from "../models/projectLabel.models.ts";
import { projectMembers } from "../models/projectMember.models.ts";
import { projects } from "../models/project.models.ts";
import { users } from "../models/user.models.ts";
import { workspaceMembers } from "../models/workspaceMember.models.ts";
import asyncHandler from "../utils/async-handler.ts";
import ApiError from "../utils/api-error.ts";
import ApiResponse from "../utils/api-respnse.ts";
import { ProjectStatus, WorkspaceRole } from "../utils/constant.ts";
import type { CustomRequest } from "../utils/types.ts";
import {
  addProjectLabelsSchema,
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

const getUserProjects = asyncHandler(async (req, res) => {
  const currentUserId = (req as unknown as CustomRequest).user?.id;
  if (!currentUserId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { workspaceId } = req.params;
  if (!workspaceId) {
    throw new ApiError(400, "Workspace id is required");
  }

  const projectRows = await db
    .select({
      id: projects.id,
      projectLogo: projects.projectLogo,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      updatedAt: projects.updatedAt,
      role: workspaceMembers.role,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, projects.workspaceId),
        eq(workspaceMembers.userId, currentUserId),
      ),
    )
    .where(
      and(
        eq(projectMembers.userId, currentUserId),
        eq(projects.workspaceId, workspaceId),
        or(
          eq(workspaceMembers.role, WorkspaceRole.ADMIN),
          eq(projects.status, ProjectStatus.ACTIVE),
        ),
      ),
    )
    .orderBy(desc(projects.updatedAt));

  if (projectRows.length === 0) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          projects: [],
        },
        "User projects fetched successfully",
      ),
    );
  }

  const projectIds = projectRows.map((project) => project.id);

  const memberRows = await db
    .select({
      projectId: projectMembers.projectId,
      userId: users.id,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(inArray(projectMembers.projectId, projectIds));

  const membersByProject = new Map<
    string,
    Array<{
      userId: string;
      name: string;
      avatarUrl: string;
    }>
  >();

  for (const member of memberRows) {
    const projectMembersList = membersByProject.get(member.projectId) ?? [];

    projectMembersList.push({
      userId: member.userId,
      name: member.fullName,
      avatarUrl: member.avatarUrl,
    });

    membersByProject.set(member.projectId, projectMembersList);
  }

  const formattedProjects = projectRows.map((project) => ({
    id: project.id,
    projectLogo: project.projectLogo,
    name: project.name,
    description: project.description,
    status: project.status,
    role: project.role,
    members: membersByProject.get(project.id) ?? [],
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        projects: formattedProjects,
      },
      "User projects fetched successfully",
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

  const project = (req as unknown as CustomRequest).project;
  if (!project) {
    throw new ApiError(500, "Project context is missing");
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

const addProjectLabels = asyncHandler(async (req, res) => {
  const currentUserId = (req as unknown as CustomRequest).user?.id;
  if (!currentUserId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { projectId } = req.params;
  if (!projectId) {
    throw new ApiError(400, "Project id is required");
  }

  const project = (req as unknown as CustomRequest).project;
  if (!project) {
    throw new ApiError(500, "Project context is missing");
  }

  const parsed = addProjectLabelsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      errors: parsed.error.flatten().fieldErrors,
      formErrors: parsed.error.flatten().formErrors,
    });
  }

  const skipped: Array<{ name: string; reason: string }> = [];
  const normalizedLabels = [...new Set(parsed.data.labels)];

  parsed.data.labels.forEach((label, index) => {
    if (normalizedLabels.indexOf(label) !== index) {
      skipped.push({
        name: label,
        reason: "Label was duplicated in the request",
      });
    }
  });

  const existingLabels =
    normalizedLabels.length > 0
      ? await db
        .select({
          name: projectLabels.name,
        })
        .from(projectLabels)
        .where(eq(projectLabels.projectId, projectId))
      : [];

  const existingLabelNames = new Set(
    existingLabels.map((label) => label.name),
  );

  const labelsToCreate = normalizedLabels.filter((label) => {
    const alreadyExists = existingLabelNames.has(label);

    if (alreadyExists) {
      skipped.push({
        name: label,
        reason: "Label already exists in this project",
      });
    }

    return !alreadyExists;
  });

  if (labelsToCreate.length === 0) {
    throw new ApiError(
      409,
      skipped.length > 0
        ? skipped.map((entry) => `${entry.name}: ${entry.reason}`).join(", ")
        : "No valid labels found to add to the project",
    );
  }

  const createdLabels = await db
    .insert(projectLabels)
    .values(
      labelsToCreate.map((name) => ({
        projectId,
        name,
        createdBy: currentUserId,
      })),
    )
    .returning({
      id: projectLabels.id,
      projectId: projectLabels.projectId,
      name: projectLabels.name,
      createdBy: projectLabels.createdBy,
      createdAt: projectLabels.createdAt,
    });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        projectId: project.id,
        projectName: project.name,
        labels: createdLabels,
        skipped,
      },
      "Project labels added successfully",
    ),
  );
});

export { createProject, getUserProjects, addProjectMembers, addProjectLabels };
