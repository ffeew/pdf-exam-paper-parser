import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // Database (Turso)
  TURSO_DATABASE_URL: z.url(),
  TURSO_AUTH_TOKEN: z.string().min(1),

  // Authentication (better-auth)
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),

  // Cloudflare R2 Storage
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1),

  // AI Services
  MISTRAL_API_KEY: z.string().min(1),
  GROQ_API_KEY: z.string().min(1),

  // Optional: Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:");
    console.error(z.treeifyError(parsed.error));
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = validateEnv();
