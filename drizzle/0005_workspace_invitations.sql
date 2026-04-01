CREATE TABLE "workspace_invitations" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" varchar(36) NOT NULL,
	"email" varchar(100) NOT NULL,
	"role" varchar(10) DEFAULT 'MEMBER' NOT NULL,
	"invited_by" varchar(36) NOT NULL,
	"status" varchar(10) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_invitations"
  ADD CONSTRAINT "workspace_invitations_role_check"
  CHECK ("role" IN ('ADMIN', 'MEMBER', 'VIEWER'));
--> statement-breakpoint
ALTER TABLE "workspace_invitations"
  ADD CONSTRAINT "workspace_invitations_status_check"
  CHECK ("status" IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'));
