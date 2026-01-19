import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { exams } from "@/lib/db/schema";
import { getUploadUrl, fileExists } from "@/lib/storage";
import { generateFileKey } from "@/lib/storage/utils";
import { processExamAsync } from "@/lib/services/exam-processor";
import type { GetUploadUrlRequest, ConfirmUploadRequest } from "./validator";

export async function generatePresignedUploadUrl(data: GetUploadUrlRequest) {
  const fileKey = generateFileKey("pdfs", data.filename);
  const uploadUrl = await getUploadUrl(fileKey, data.contentType, 3600);
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  return { uploadUrl, fileKey, expiresAt };
}

export async function confirmUploadAndCreateExam(
  data: ConfirmUploadRequest,
  userId: string
) {
  // Verify file exists in R2
  const exists = await fileExists(data.fileKey);
  if (!exists) {
    throw new Error("File not found in storage");
  }

  const examId = randomUUID();
  const now = new Date();

  // Create exam record
  await db.insert(exams).values({
    id: examId,
    userId,
    filename: data.filename,
    pdfKey: data.fileKey,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });

  // Trigger async processing (fire-and-forget)
  processExamAsync(examId, data.fileKey).catch((error) => {
    console.error(`Failed to start processing for exam ${examId}:`, error);
  });

  return {
    examId,
    status: "processing" as const,
    message: "PDF uploaded successfully. Processing started.",
  };
}
