import { randomUUID } from "crypto";

// Generate unique file key with folder structure
export function generateFileKey(folder: string, filename: string) {
  const ext = filename.split(".").pop();
  const uuid = randomUUID();
  return `${folder}/${uuid}.${ext}`;
}

// Validate file type
export function isValidFileType(contentType: string, allowedTypes: string[]) {
  return allowedTypes.includes(contentType);
}

// Allowed content types
export const ALLOWED_PDF_TYPES = ["application/pdf"];
export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];
