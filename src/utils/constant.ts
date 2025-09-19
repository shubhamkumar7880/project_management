export enum UserRole {
  ADMIN = "admin",
  MEMBER = "member",
  GUEST = "guest",
}

export const availableRoles = Object.values(UserRole);

export enum TaskStatus {
  TODO = "todo",
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  DONE = "done",
}

export const availableTaskStatuses = Object.values(TaskStatus);
