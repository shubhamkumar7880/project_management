export enum WorkspaceRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  VIEWER = "VIEWER",
}

export const workspaceRoles = Object.values(WorkspaceRole);

export type WorkspaceRoleType = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];