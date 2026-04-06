export enum WorkspaceRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  VIEWER = "VIEWER",
}

export const workspaceRoles = Object.values(WorkspaceRole);

export type WorkspaceRoleType = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

export enum WorkspaceInvitationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

export const workspaceInvitationStatuses = Object.values(WorkspaceInvitationStatus);

export type WorkspaceInvitationStatusType =
  (typeof WorkspaceInvitationStatus)[keyof typeof WorkspaceInvitationStatus];

export enum ProjectType {
  KANBAN = "KANBAN",
  SCRUM = "SCRUM",
}

export const projectTypes = [ProjectType.KANBAN, ProjectType.SCRUM] as const;

export type ProjectTypeType = (typeof ProjectType)[keyof typeof ProjectType];

export enum ProjectStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export const projectStatuses = [
  ProjectStatus.ACTIVE,
  ProjectStatus.INACTIVE,
] as const;

export type ProjectStatusType =
  (typeof ProjectStatus)[keyof typeof ProjectStatus];
