CREATE TABLE IF NOT EXISTS "estimates" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"story_id" text NOT NULL,
	"estimate" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"estimated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_participants" (
	"session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stories" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"session_id" text NOT NULL,
	"storie_id" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stories" ADD CONSTRAINT "stories_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
