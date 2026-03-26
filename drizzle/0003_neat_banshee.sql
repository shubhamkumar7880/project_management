ALTER TABLE "workspace_members" ALTER COLUMN "joined_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workspace_members" ALTER COLUMN "joined_at" DROP NOT NULL;