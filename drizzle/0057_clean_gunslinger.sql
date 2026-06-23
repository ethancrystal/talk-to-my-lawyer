CREATE TABLE "organization_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"email" varchar(320) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"role" varchar(32) DEFAULT 'member' NOT NULL,
	"invited_by_user_id" integer,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "stripe_subscription_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_org_invitations_token_hash" ON "organization_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_org_invitations_org_id" ON "organization_invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_org_invitations_pending" ON "organization_invitations" USING btree ("organization_id","email") WHERE "organization_invitations"."status" = 'pending';