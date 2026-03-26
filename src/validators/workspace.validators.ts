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
