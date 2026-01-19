import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET } from "./r2-client";

// Generate presigned URL for client-side upload
export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
) {
  return getSignedUrl(
    r2Client,
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  );
}

// Generate presigned URL for downloading/viewing
export async function getDownloadUrl(key: string, expiresIn = 3600) {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }),
    { expiresIn }
  );
}

// Check if file exists
export async function fileExists(key: string): Promise<boolean> {
  try {
    await r2Client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

// Delete file
export async function deleteFile(key: string) {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  );
}

// Server-side upload (for extracted images from OCR)
export async function uploadBuffer(
  key: string,
  body: Buffer,
  contentType: string
) {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}
