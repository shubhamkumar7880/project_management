import { db } from "../db/index.ts";
import { workspaces } from "../models/workspace.models.ts";
import { workspaceMembers } from "../models/workspaceMember.models.ts";
import { workspaceInvitations } from "../models/workspaceInvitation.models.ts";
import asyncHandler from "../utils/async-handler.ts";
import ApiError from "../utils/api-error.ts";
import ApiResponse from "../utils/api-respnse.ts";
import type { CustomRequest } from "../utils/types.ts";
import {
    createWorkspaceSchema,
    sendWorkspaceInvitationsSchema,
    updateWorkspaceSchema,
} from "../validators/workspace.validators.ts";
import { v2 as cloudinary } from "cloudinary";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { users } from "../models/user.models.ts";
import { sendEmail, workspaceInvitationMailgenContent } from "../utils/mail.ts";
import { WorkspaceRole, workspaceRoles } from "../utils/constant.ts";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
    api_key: process.env.CLOUDINARY_API_KEY as string,
    api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

const createWorkspace = asyncHandler(async (req, res) => {
    const currentUserId = (req as unknown as CustomRequest).user?.id;
    if (!currentUserId) {
        throw new ApiError(401, "Unauthorized request");
    }

    const parsed = createWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const { name, description } = parsed.data;

    let avatarUrl = "https://placehold.co/200x200";
    if (req.file) {
        try {
            const buffer = req.file.buffer;
            if (!buffer) {
                throw new ApiError(
                    400,
                    "Invalid workspace avatar file upload: file buffer is missing",
                );
            }
            const dataUri = `data:${req.file.mimetype};base64,${buffer.toString("base64")}`;
            const uploadResult = await cloudinary.uploader.upload(dataUri, {
                folder: "workspace-avatars",
                resource_type: "image",
            });
            avatarUrl = uploadResult.secure_url;
        } catch (error: unknown) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(
                400,
                "Failed to upload workspace avatar. Please try again.",
            );
        }
    }

    const [createdWorkspace] = await db
        .insert(workspaces)
        .values({
            name,
            description,
            workspaceAvatar: avatarUrl,
            createdBy: currentUserId,
        })
        .returning({
            id: workspaces.id,
            name: workspaces.name,
            description: workspaces.description,
            workspaceAvatar: workspaces.workspaceAvatar,
            createdBy: workspaces.createdBy,
            createdAt: workspaces.createdAt,
            updatedAt: workspaces.updatedAt,
        });

    if (!createdWorkspace) {
        throw new ApiError(500, "Unable to create workspace");
    }

    await db.insert(workspaceMembers).values({
        userId: currentUserId,
        workspaceId: createdWorkspace.id,
        role: WorkspaceRole.ADMIN,
        joinedAt: new Date(),
    });

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                workspace: createdWorkspace,
            },
            "Workspace created successfully",
        ),
    );
});

const getUserWorkspaces = asyncHandler(async (req, res) => {
    const currentUserId = (req as unknown as CustomRequest).user?.id;
    if (!currentUserId) {
        throw new ApiError(401, "Unauthorized request");
    }

    const workspaceRows = await db
        .select({
            id: workspaces.id,
            name: workspaces.name,
            description: workspaces.description,
            workspaceAvatar: workspaces.workspaceAvatar,
            createdBy: workspaces.createdBy,
            createdAt: workspaces.createdAt,
            updatedAt: workspaces.updatedAt,
            role: workspaceMembers.role,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(eq(workspaceMembers.userId, currentUserId))
        .orderBy(desc(workspaces.updatedAt));

    if (workspaceRows.length === 0) {
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    workspaces: [],
                },
                "User workspaces fetched successfully",
            ),
        );
    }

    const workspaceIds = workspaceRows.map((workspace) => workspace.id);

    const memberRows = await db
        .select({
            workspaceId: workspaceMembers.workspaceId,
            userId: users.id,
            username: users.username,
            avatarUrl: users.avatarUrl,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(inArray(workspaceMembers.workspaceId, workspaceIds));

    const membersByWorkspace = new Map<
        string,
        Array<{
            userId: string;
            username: string;
            avatarUrl: string;
        }>
    >();

    for (const member of memberRows) {
        const workspaceMembersList =
            membersByWorkspace.get(member.workspaceId) ?? [];

        workspaceMembersList.push({
            userId: member.userId,
            username: member.username,
            avatarUrl: member.avatarUrl,
        });

        membersByWorkspace.set(member.workspaceId, workspaceMembersList);
    }

    const formattedWorkspaces = workspaceRows.map((workspace) => {
        const members = membersByWorkspace.get(workspace.id) ?? [];

        return {
            id: workspace.id,
            name: workspace.name,
            description: workspace.description,
            workspaceAvatar: workspace.workspaceAvatar,
            createdBy: workspace.createdBy,
            createdAt: workspace.createdAt,
            updatedAt: workspace.updatedAt,
            role: workspace.role,
            totalMembers: members.length,
            members,
        };
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                workspaces: formattedWorkspaces,
            },
            "User workspaces fetched successfully",
        ),
    );
});

const updateWorkspace = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    if (!workspaceId) {
        throw new ApiError(400, "Workspace id is required");
    }

    const parsed = updateWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            errors: parsed.error.flatten().fieldErrors,
            formErrors: parsed.error.flatten().formErrors,
        });
    }

    const updatePayload: {
        name: string;
        description?: string;
        workspaceAvatar?: string;
        updatedAt: Date;
    } = {
        name: parsed.data.name,
        updatedAt: new Date(),
    };

    if (parsed.data.description !== undefined) {
        updatePayload.description = parsed.data.description;
    }

    if (req.file) {
        try {
            const buffer = req.file.buffer;
            if (!buffer) {
                throw new ApiError(
                    400,
                    "Invalid workspace avatar file upload: file buffer is missing",
                );
            }

            const dataUri = `data:${req.file.mimetype};base64,${buffer.toString("base64")}`;
            const uploadResult = await cloudinary.uploader.upload(dataUri, {
                folder: "workspace-avatars",
                resource_type: "image",
            });
            updatePayload.workspaceAvatar = uploadResult.secure_url;
        } catch (error: unknown) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(
                400,
                "Failed to upload workspace avatar. Please try again.",
            );
        }
    }

    const [updatedWorkspace] = await db
        .update(workspaces)
        .set(updatePayload)
        .where(eq(workspaces.id, workspaceId))
        .returning({
            id: workspaces.id,
            name: workspaces.name,
            description: workspaces.description,
            workspaceAvatar: workspaces.workspaceAvatar,
            createdBy: workspaces.createdBy,
            createdAt: workspaces.createdAt,
            updatedAt: workspaces.updatedAt,
        });

    if (!updatedWorkspace) {
        throw new ApiError(500, "Unable to update workspace");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                workspace: updatedWorkspace,
            },
            "Workspace updated successfully",
        ),
    );
});

const deleteWorkspace = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    if (!workspaceId) {
        throw new ApiError(400, "Workspace id is required");
    }

    const workspace = (req as unknown as CustomRequest).workspace;
    if (!workspace) {
        throw new ApiError(500, "Workspace authorization context is missing");
    }

    await db.transaction(async (tx) => {
        await tx
            .delete(workspaceMembers)
            .where(eq(workspaceMembers.workspaceId, workspaceId));

        await tx.delete(workspaces).where(eq(workspaces.id, workspaceId));
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                workspace,
            },
            "Workspace deleted successfully",
        ),
    );
});

const inviteWorkspaceMembers = asyncHandler(async (req, res) => {
    const currentUserId = (req as unknown as CustomRequest).user?.id;
    const workspace = (req as unknown as CustomRequest).workspace;
    const { workspaceId } = req.params;

    if (!currentUserId) {
        throw new ApiError(401, "Unauthorized request");
    }

    if (!workspaceId) {
        throw new ApiError(400, "Workspace id is required");
    }

    if (!workspace) {
        throw new ApiError(500, "Workspace authorization context is missing");
    }

    const invitationLink = process.env.WORKSPACE_INVITATION_URL;
    if (!invitationLink) {
        throw new ApiError(500, "WORKSPACE_INVITATION_URL is not configured");
    }

    const parsed = sendWorkspaceInvitationsSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            errors: parsed.error.flatten().fieldErrors,
            formErrors: parsed.error.flatten().formErrors,
        });
    }

    const normalizedEmails = [...new Set(parsed.data.emails)];
    const role = parsed.data.role;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const existingInvitations = await db
        .select({
            id: workspaceInvitations.id,
            email: workspaceInvitations.email,
            status: workspaceInvitations.status,
            expiresAt: workspaceInvitations.expiresAt,
        })
        .from(workspaceInvitations)
        .where(
            and(
                eq(workspaceInvitations.workspaceId, workspaceId),
                inArray(workspaceInvitations.email, normalizedEmails),
            ),
        );

    const invitationsByEmail = new Map<
        string,
        Array<{ id: string; status: string, expiresAt: Date }>
    >();

    for (const invitation of existingInvitations) {
        const emailInvitations =
            invitationsByEmail.get(invitation.email.toLowerCase()) ?? [];

        emailInvitations.push({
            id: invitation.id,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
        });

        invitationsByEmail.set(invitation.email.toLowerCase(), emailInvitations);
    }

    const skipped: Array<{ email: string; reason: string }> = [];
    const emailsToInvite: string[] = [];

    for (const email of normalizedEmails) {
        const invitationsForEmail = invitationsByEmail.get(email) ?? [];
        const blockingInvitation = invitationsForEmail.find(
            (invitation) =>
                (invitation.status === "PENDING" && invitation.expiresAt > new Date()) || invitation.status === "ACCEPTED",
        );

        if (
            !!blockingInvitation
        ) {
            skipped.push({
                email,
                reason: `Invitation already ${blockingInvitation.status.toLowerCase()} for this workspace`,
            });
            continue;
        }

        emailsToInvite.push(email);
    }

    if (emailsToInvite.length === 0) {
        throw new ApiError(
            409,
            skipped.length > 0
                ? skipped.map((entry) => `${entry.email}: ${entry.reason}`).join(", ")
                : "No valid emails found to invite",
        );
    }

    await db.insert(workspaceInvitations).values(
        emailsToInvite.map((email) => ({
            workspaceId,
            email,
            role,
            invitedBy: currentUserId,
            expiresAt,
        })),
    );

    await Promise.all(
        emailsToInvite.map((email) =>
            sendEmail({
                email,
                subject: `Invitation to join ${workspace.name}`,
                mailgenContent: workspaceInvitationMailgenContent(
                    email.split("@")[0] ?? "there",
                    workspace.name,
                    invitationLink,
                    role,
                ),
            }),
        ),
    );

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                invitedEmails: emailsToInvite,
                skipped,
                role,
                expiresAt,
            },
            "Workspace invitations sent successfully",
        ),
    );
});

export {
    createWorkspace,
    getUserWorkspaces,
    updateWorkspace,
    deleteWorkspace,
    inviteWorkspaceMembers,
};
