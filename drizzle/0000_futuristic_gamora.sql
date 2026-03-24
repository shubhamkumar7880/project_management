CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"avatar_url" text DEFAULT 'https://placehold.co/200x200' NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(100) NOT NULL,
	"full_name" varchar(100) NOT NULL,
	"password" text NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"refresh_token" text,
	"forgot_password_token" text,
	"forgot_password_token_expiry" timestamp,
	"email_verification_token" text,
	"email_verification_expiry" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "username_idx" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE UNIQUE INDEX "email_idx" ON "users" USING btree (lower("email"));

-- migration.sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
