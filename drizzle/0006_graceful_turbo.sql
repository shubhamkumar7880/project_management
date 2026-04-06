CREATE TYPE "public"."project_type" AS ENUM('KANBAN', 'SCRUM');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_logo" text DEFAULT 'https://placehold.co/200x200' NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"project_type" "project_type" NOT NULL,
	"workspace_id" varchar(36) NOT NULL,
	"created_by" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;