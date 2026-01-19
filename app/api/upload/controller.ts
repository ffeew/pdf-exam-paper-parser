import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  GetUploadUrlRequestSchema,
  ConfirmUploadRequestSchema,
} from "./validator";
import { generatePresignedUploadUrl, confirmUploadAndCreateExam } from "./service";

export async function handleGetUploadUrl(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = GetUploadUrlRequestSchema.parse(body);
    const result = await generatePresignedUploadUrl(validated);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error generating upload URL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function handleConfirmUpload(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = ConfirmUploadRequestSchema.parse(body);
    const result = await confirmUploadAndCreateExam(validated, session.user.id);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "File not found in storage") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error confirming upload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
