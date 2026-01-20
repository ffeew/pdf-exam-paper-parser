import { z } from "zod";

// Request to get presigned upload URL
export const GetUploadUrlRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.literal("application/pdf"),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024), // 50MB max
});
export type GetUploadUrlRequest = z.infer<typeof GetUploadUrlRequestSchema>;

// Response with presigned URL
export const GetUploadUrlResponseSchema = z.object({
  uploadUrl: z.url(),
  fileKey: z.string(),
  expiresAt: z.iso.datetime(),
});
export type GetUploadUrlResponse = z.infer<typeof GetUploadUrlResponseSchema>;

// Request to check if file hash already exists
export const CheckHashRequestSchema = z.object({
  fileHash: z.string().length(64), // SHA-256 produces 64 hex characters
});
export type CheckHashRequest = z.infer<typeof CheckHashRequestSchema>;

// Response for hash check
export const CheckHashResponseSchema = z.object({
  isDuplicate: z.boolean(),
  existingExam: z
    .object({
      examId: z.string(),
      filename: z.string(),
      status: z.enum(["pending", "processing", "completed", "failed"]),
      createdAt: z.string(),
    })
    .optional(),
});
export type CheckHashResponse = z.infer<typeof CheckHashResponseSchema>;

// Request to confirm upload and start processing
export const ConfirmUploadRequestSchema = z.object({
  fileKey: z.string().min(1),
  filename: z.string().min(1).max(255),
  fileHash: z.string().length(64), // SHA-256 hash
});
export type ConfirmUploadRequest = z.infer<typeof ConfirmUploadRequestSchema>;

// Response after upload confirmed
export const ConfirmUploadResponseSchema = z.object({
  examId: z.string(),
  status: z.enum(["pending", "processing"]),
  message: z.string(),
  isDuplicate: z.boolean().optional(),
});
export type ConfirmUploadResponse = z.infer<typeof ConfirmUploadResponseSchema>;
