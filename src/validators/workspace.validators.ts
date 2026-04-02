import { z } from "zod";

export const createWorkspaceSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Workspace name is required"),
    description: z
        .string()
        .trim()
        .max(250, "Description must be at most 250 characters")
        .optional(),
});

export const updateWorkspaceSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "Workspace name is required"),
        description: z
            .string()
            .trim()
            .max(250, "Description must be at most 250 characters")
            .optional(),
    });

export const sendWorkspaceInvitationsSchema = z.object({
    emails: z
        .array(z.email("Invalid email address").transform((email) => email.trim().toLowerCase()))
        .min(1, "At least one email is required"),
    role: z
        .enum(["ADMIN", "MEMBER", "VIEWER"])
});

export const respondToWorkspaceInvitationSchema = z.object({
    action: z.enum(["ACCEPT", "REJECT"]),
});
