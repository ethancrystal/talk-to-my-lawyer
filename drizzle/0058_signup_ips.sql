CREATE TABLE "signup_ips" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ip" varchar(64) NOT NULL,
	"email" varchar(320),
	"method" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signup_ips_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "signup_ips" ADD CONSTRAINT "signup_ips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_signup_ips_ip" ON "signup_ips" USING btree ("ip");--> statement-breakpoint
ALTER TABLE "signup_ips" ENABLE ROW LEVEL SECURITY;