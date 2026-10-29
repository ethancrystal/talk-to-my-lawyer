CREATE TABLE IF NOT EXISTS "blog_post_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "blog_post_chunks" ADD CONSTRAINT "blog_post_chunks_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_blog_post_chunks_post_id" ON "blog_post_chunks" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_blog_post_chunks_embedding" ON "blog_post_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "blog_post_chunks" ENABLE ROW LEVEL SECURITY;
