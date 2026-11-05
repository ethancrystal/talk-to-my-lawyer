export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // AI Pipeline — these are lazy getters so they reflect the CURRENT
  // process.env at the time of access. Required because tests (e.g.
  // phase92) mutate process.env in beforeEach to control failover
  // routing; a snapshot captured at module-load would freeze stale
  // values and break test isolation. Production code still gets the
  // same value it would with a snapshot — process.env is set once at
  // startup via dotenv.
  get anthropicApiKey() { return process.env.ANTHROPIC_API_KEY ?? ""; },
  // Sent as the `anthropic-workspace-id` header; required for workspace-wide keys.
  get anthropicWorkspaceId() { return process.env.ANTHROPIC_WORKSPACE_ID ?? ""; },
  get openAiApiKey() { return process.env.OPENAI_API_KEY ?? ""; },
  get perplexityApiKey() { return process.env.PERPLEXITY_API_KEY ?? ""; },
  // Google Gemini — dormant in the LangGraph failover chain but plumbed for future re-enable
  get geminiApiKey() { return process.env.GEMINI_API_KEY ?? ""; },
  get geminiModel() { return process.env.GEMINI_MODEL ?? ""; },
  // Cloudflare AI Gateway — optional proxy in front of OpenAI / Anthropic / Gemini
  get cfAiGatewayBaseUrl() { return process.env.CF_AI_GATEWAY_BASE_URL ?? ""; },
  // n8n Integration
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL ?? "",
  n8nCallbackSecret: process.env.N8N_CALLBACK_SECRET ?? "",
  // Email
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "noreply@talk-to-my-lawyer.com",
  // Cloudflare Email Worker (optional — falls back to direct Resend if not set)
  emailWorkerUrl: process.env.EMAIL_WORKER_URL ?? "",
  emailWorkerSecret: process.env.EMAIL_WORKER_SECRET ?? "",
  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
  // Upstash Redis (rate limiting + job queue)
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL ?? "",
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  upstashRedisUrl: process.env.UPSTASH_REDIS_URL ?? "",
  // Sentry
  sentryDsn: process.env.SENTRY_DSN ?? "",
  sentryOrg: process.env.SENTRY_ORG ?? "",
  sentryProject: process.env.SENTRY_PROJECT ?? "",
  // Cloudflare KV cache (optional — caching is skipped when not configured)
  kvWorkerUrl: process.env.KV_WORKER_URL ?? "",
  kvWorkerAuthToken: process.env.KV_WORKER_AUTH_TOKEN ?? "",
  // Cloudflare Worker — Affiliate referral link tracking
  affiliateWorkerUrl: process.env.AFFILIATE_WORKER_URL ?? "https://refer.talktomylawyer.com",
  affiliateWorkerSecret: process.env.AFFILIATE_WORKER_SECRET ?? "",
  // Cloudflare KV Blog Cache Worker
  cfBlogCacheWorkerUrl: process.env.CF_BLOG_CACHE_WORKER_URL ?? "",
  cfBlogCacheInvalidationSecret: process.env.CF_BLOG_CACHE_INVALIDATION_SECRET ?? "",
  // Cloudflare R2
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2BucketName: process.env.R2_BUCKET_NAME ?? "",
  r2PublicUrl: process.env.R2_PUBLIC_URL ?? "",
  // Cloudflare Worker — PDF generation (optional — falls back to local Puppeteer if not set)
  pdfWorkerUrl: process.env.PDF_WORKER_URL ?? "",
  pdfWorkerSecret: process.env.PDF_WORKER_SECRET ?? "",
  // Blog Publish API (optional — endpoint is open when not set)
  blogPublishApiKey: process.env.BLOG_PUBLISH_API_KEY ?? "",
  // GCP / Vertex AI / GCS (optional — training capture & fine-tuning)
  gcpProjectId: process.env.GCP_PROJECT_ID ?? "",
  gcpRegion: process.env.GCP_REGION ?? "",
  gcsTrainingBucket: process.env.GCS_TRAINING_BUCKET ?? "",
  googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "",
};

/**
 * Validates that all required environment variables are set.
 * Throws on startup in production if any are missing, preventing silent failures.
 */
export function validateRequiredEnv(): void {
  const missing: string[] = [];
  if (!ENV.databaseUrl) missing.push("DATABASE_URL");
  if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL)
    missing.push("SUPABASE_URL / VITE_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.VITE_SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_PUBLISHABLE_KEY)
    missing.push("VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!ENV.stripeSecretKey) missing.push("STRIPE_SECRET_KEY");
  if (!ENV.stripeWebhookSecret) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!ENV.anthropicApiKey) missing.push("ANTHROPIC_API_KEY");
  if (!ENV.resendApiKey) missing.push("RESEND_API_KEY");
  if (!ENV.r2AccountId) missing.push("R2_ACCOUNT_ID");
  if (!ENV.r2AccessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!ENV.r2SecretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!ENV.r2BucketName) missing.push("R2_BUCKET_NAME");
  if (missing.length > 0) {
    throw new Error(
      `[Startup] Missing required environment variables: ${missing.join(", ")}\n` +
        "Server cannot start without these. Check your Railway / .env configuration."
    );
  }
}
