import { NextRequest } from "next/server";
import {
  handleGetUploadUrl,
  handleConfirmUpload,
  handleCheckHash,
} from "./controller";

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "checkHash") {
    return handleCheckHash(request);
  } else if (action === "presign") {
    return handleGetUploadUrl(request);
  } else if (action === "confirm") {
    return handleConfirmUpload(request);
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
