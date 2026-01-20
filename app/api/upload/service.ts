import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { exams } from "@/lib/db/schema";
import { getUploadUrl, fileExists, deleteFile } from "@/lib/storage";
import { generateFileKey } from "@/lib/storage/utils";
import { processExamAsync } from "@/lib/services/exam-processor";
import type {
  GetUploadUrlRequest,
  ConfirmUploadRequest,
  CheckHashResponse,
} from "./validator";

export async function generatePresignedUploadUrl(data: GetUploadUrlRequest) {
  const fileKey = generateFileKey("pdfs", data.filename);
  const uploadUrl = await getUploadUrl(fileKey, data.contentType, 3600);
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  return { uploadUrl, fileKey, expiresAt };
}

export async function checkFileHashExists(
  fileHash: string,
  userId: string
): Promise<CheckHashResponse> {
  const existing = await db.query.exams.findFirst({
    where: and(eq(exams.userId, userId), eq(exams.fileHash, fileHash)),
    columns: {
      id: true,
      filename: true,
      status: true,
      createdAt: true,
    },
  });

  if (existing) {
    return {
      isDuplicate: true,
      existingExam: {
        examId: existing.id,
        filename: existing.filename,
        status: existing.status,
        createdAt: existing.createdAt.toISOString(),
      },
    };
  }

  return { isDuplicate: false };
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

  // Double-check for race condition (another request might have inserted)
  const existingCheck = await checkFileHashExists(data.fileHash, userId);
  if (existingCheck.isDuplicate && existingCheck.existingExam) {
    // Clean up the uploaded file since it's a duplicate
    await deleteFile(data.fileKey);
    return {
      examId: existingCheck.existingExam.examId,
      status: existingCheck.existingExam.status as "pending" | "processing",
      message: "This file has already been uploaded.",
      isDuplicate: true,
    };
  }

  const examId = randomUUID();
  const now = new Date();

  // Create exam record with hash
  await db.insert(exams).values({
    id: examId,
    userId,
    filename: data.filename,
    pdfKey: data.fileKey,
    fileHash: data.fileHash,
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
