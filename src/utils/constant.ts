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
