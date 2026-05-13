-- Initial KuberTube schema — generated from packages/db/src/schema/* (Phase 0–5).
-- Run via `pnpm db:migrate`. For local dev a faster alternative is `pnpm db:push`
-- which pushes the schema directly without writing a migration journal entry.

CREATE TYPE "public"."api_provider" AS ENUM('youtube', 'brave', 'anthropic');
CREATE TYPE "public"."user_level" AS ENUM('beginner', 'intermediate', 'advanced');
CREATE TYPE "public"."user_duration" AS ENUM('short', 'medium', 'long');
CREATE TYPE "public"."user_balance" AS ENUM('video', 'text', 'mixed');
CREATE TYPE "public"."user_freshness" AS ENUM('any', '6m', '1y', '2y');
CREATE TYPE "public"."ui_theme" AS ENUM('light', 'dark', 'system');
CREATE TYPE "public"."resource_type" AS ENUM('video', 'article');
CREATE TYPE "public"."resource_source" AS ENUM('youtube', 'web');
CREATE TYPE "public"."search_provider" AS ENUM('youtube', 'brave');
CREATE TYPE "public"."summary_type" AS ENUM('short', 'detailed');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean NOT NULL DEFAULT false,
  "display_name" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" timestamp with time zone NOT NULL,
  "token" text NOT NULL UNIQUE,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "accounts" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp with time zone,
  "refresh_token_expires_at" timestamp with time zone,
  "scope" text,
  "password" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "verifications" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "user_settings" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "default_level" "user_level" NOT NULL DEFAULT 'beginner',
  "default_duration" "user_duration" NOT NULL DEFAULT 'medium',
  "default_balance" "user_balance" NOT NULL DEFAULT 'mixed',
  "default_freshness" "user_freshness" NOT NULL DEFAULT 'any',
  "ui_theme" "ui_theme" NOT NULL DEFAULT 'system',
  "ui_language" text NOT NULL DEFAULT 'en',
  "onboarding_completed" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "user_api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider" "api_provider" NOT NULL,
  "encrypted_key" text NOT NULL,
  "key_last4" text NOT NULL,
  "key_version" text NOT NULL DEFAULT 'v1',
  "last_used_at" timestamp with time zone,
  "last_validated_at" timestamp with time zone,
  "is_valid" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "user_api_keys_user_provider_unique" UNIQUE ("user_id", "provider")
);
CREATE INDEX "user_api_keys_user_idx" ON "user_api_keys" ("user_id");

CREATE TABLE "workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "goal" text NOT NULL,
  "filters_json" jsonb NOT NULL,
  "metadata_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "last_opened_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone
);
CREATE INDEX "workspaces_user_last_opened_idx" ON "workspaces" ("user_id", "last_opened_at" DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX "workspaces_user_deleted_idx" ON "workspaces" ("user_id", "deleted_at");

CREATE TABLE "resources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "type" "resource_type" NOT NULL,
  "source" "resource_source" NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "thumbnail_url" text,
  "duration_seconds" integer,
  "published_at" timestamp with time zone,
  "metadata_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "saved_at" timestamp with time zone NOT NULL DEFAULT now(),
  "last_opened_at" timestamp with time zone,
  "progress_seconds" integer NOT NULL DEFAULT 0,
  "is_completed" boolean NOT NULL DEFAULT false,
  "deleted_at" timestamp with time zone
);
CREATE INDEX "resources_workspace_saved_idx" ON "resources" ("workspace_id", "saved_at" DESC)
  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX "resources_workspace_url_unique" ON "resources" ("workspace_id", "url")
  WHERE deleted_at IS NULL;

CREATE TABLE "resource_summaries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "resource_id" uuid NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
  "content_md" text NOT NULL,
  "summary_type" "summary_type" NOT NULL,
  "model_used" text NOT NULL,
  "tokens_used" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "resource_summaries_resource_idx" ON "resource_summaries" ("resource_id", "created_at" DESC);

CREATE TABLE "notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "resource_id" uuid NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
  "content_md" text NOT NULL DEFAULT '',
  "timestamp_seconds" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone
);
CREATE INDEX "notes_resource_idx" ON "notes" ("resource_id", "timestamp_seconds")
  WHERE deleted_at IS NULL;

CREATE TABLE "search_queries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "query_text" text NOT NULL,
  "filters_json" jsonb NOT NULL,
  "results_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "search_results_cache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "query_hash" text NOT NULL,
  "provider" "search_provider" NOT NULL,
  "results_json" jsonb NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone NOT NULL
);
CREATE UNIQUE INDEX "search_results_cache_hash_provider_unique" ON "search_results_cache" ("query_hash", "provider");
