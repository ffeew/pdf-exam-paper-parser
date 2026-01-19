"use client";

import { useMutation } from "@tanstack/react-query";
import type { ConfirmUploadResponse } from "@/app/api/upload/validator";

interface UploadProgress {
  stage: "presign" | "upload" | "confirm";
  progress: number;
}

export function useUploadExam(options?: {
  onProgress?: (progress: UploadProgress) => void;
}) {
  return useMutation({
    mutationFn: async (file: File): Promise<ConfirmUploadResponse> => {
      options?.onProgress?.({ stage: "presign", progress: 0 });

      // Step 1: Get presigned URL
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
      options?.onProgress?.({ stage: "upload", progress: 33 });

      // Step 2: Upload to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      options?.onProgress?.({ stage: "confirm", progress: 66 });

      // Step 3: Confirm upload and start processing
      const confirmResponse = await fetch("/api/upload?action=confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey, filename: file.name }),
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
