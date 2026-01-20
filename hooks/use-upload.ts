"use client";

import { useMutation } from "@tanstack/react-query";
import { computeFileHash } from "@/lib/utils/file-hash";
import type {
  ConfirmUploadResponse,
  CheckHashResponse,
} from "@/app/api/upload/validator";

interface UploadProgress {
  stage: "hashing" | "checking" | "presign" | "upload" | "confirm";
  progress: number;
}

interface UploadResult extends ConfirmUploadResponse {
  isDuplicate?: boolean;
}

export function useUploadExam(options?: {
  onProgress?: (progress: UploadProgress) => void;
  onDuplicate?: (existingExam: CheckHashResponse["existingExam"]) => void;
}) {
  return useMutation({
    mutationFn: async (file: File): Promise<UploadResult> => {
      // Step 0: Compute file hash
      options?.onProgress?.({ stage: "hashing", progress: 0 });
      const fileHash = await computeFileHash(file);
      options?.onProgress?.({ stage: "checking", progress: 10 });

      // Step 1: Check if hash already exists
      const checkResponse = await fetch("/api/upload?action=checkHash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileHash }),
      });

      if (!checkResponse.ok) {
        const error = await checkResponse.json().catch(() => ({}));
        throw new Error(error.error || "Failed to check for duplicates");
      }

      const checkResult: CheckHashResponse = await checkResponse.json();

      if (checkResult.isDuplicate && checkResult.existingExam) {
        // Notify about duplicate and return existing exam info
        options?.onDuplicate?.(checkResult.existingExam);
        return {
          examId: checkResult.existingExam.examId,
          status: checkResult.existingExam.status as "pending" | "processing",
          message: "This file was already uploaded.",
          isDuplicate: true,
        };
      }

      options?.onProgress?.({ stage: "presign", progress: 20 });

      // Step 2: Get presigned URL
      const presignResponse = await fetch("/api/upload?action=presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!presignResponse.ok) {
        const error = await presignResponse.json().catch(() => ({}));
        throw new Error(error.error || "Failed to get upload URL");
      }

      const { uploadUrl, fileKey } = await presignResponse.json();
      options?.onProgress?.({ stage: "upload", progress: 40 });

      // Step 3: Upload to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      options?.onProgress?.({ stage: "confirm", progress: 80 });

      // Step 4: Confirm upload with hash
      const confirmResponse = await fetch("/api/upload?action=confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey, filename: file.name, fileHash }),
      });

      if (!confirmResponse.ok) {
        const error = await confirmResponse.json().catch(() => ({}));
        throw new Error(error.error || "Failed to confirm upload");
      }

      options?.onProgress?.({ stage: "confirm", progress: 100 });
      return confirmResponse.json();
    },
  });
}
