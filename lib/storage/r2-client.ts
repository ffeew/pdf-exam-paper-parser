import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/config/env";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

export const R2_BUCKET = env.CLOUDFLARE_R2_BUCKET_NAME;
