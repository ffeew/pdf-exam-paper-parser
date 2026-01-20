import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { GradeAnswerRequestSchema } from "./validator";
import { gradeAnswer } from "./service";
import { AuthorizationError } from "@/lib/services/authorization";

export async function handleGradeAnswer(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    // Parse request body
    const body = await request.json();
    const parseResult = GradeAnswerRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { examId, questionId, model } = parseResult.data;

    const result = await gradeAnswer(user.id, examId, questionId, model);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    // Handle specific errors
    if (error instanceof Error) {
      if (
        error.message === "No answer submitted for this question" ||
        error.message === "Answer is empty" ||
        error.message === "Question not found"
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    console.error("Error grading answer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
