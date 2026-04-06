import { z } from "zod";
import {
  ProjectStatus,
  projectStatuses,
  projectTypes,
} from "../utils/constant.ts";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required"),
  description: z
    .string()
    .trim()
    .max(250, "Description must be at most 250 characters")
    .optional(),
  projectType: z.enum(projectTypes, {
    error: "Project type must be either KANBAN or SCRUM",
  }),
  status: z
    .enum(projectStatuses, {
      error: "Project status must be either active or inactive",
    })
    .default(ProjectStatus.ACTIVE),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").optional(),
  description: z
    .string()
    .trim()
    .max(250, "Description must be at most 250 characters")
    .optional(),
  projectType: z
    .enum(projectTypes, {
      error: "Project type must be either KANBAN or SCRUM",
    })
    .optional(),
  status: z
    .enum(projectStatuses, {
      error: "Project status must be either active or inactive",
    })
    .optional(),
});

export const addProjectMembersSchema = z.object({
  userIds: z
    .array(z.string().trim().min(1, "User id is required"))
    .min(1, "At least one user id is required"),
});
