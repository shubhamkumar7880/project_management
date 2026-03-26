ALTER TABLE "workspace_members"
  ADD CONSTRAINT "workspace_members_role_check"
  CHECK ("role" IN ('ADMIN', 'MEMBER', 'VIEWER'));
