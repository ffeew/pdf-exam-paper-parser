import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  SubmitAnswerRequestSchema,
  GetAnswersQuerySchema,
} from "./validator";
import { submitAnswer, getExamAnswers } from "./service";
import { AuthorizationError } from "@/lib/services/authorization";

export async function handleSubmitAnswer(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    // Parse request body
    const body = await request.json();
    const parseResult = SubmitAnswerRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { examId, questionId, answerText, selectedOptionId } =
      parseResult.data;

    const answer = await submitAnswer(
      user.id,
      examId,
      questionId,
      answerText,
      selectedOptionId
    );

    return NextResponse.json(answer);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error submitting answer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function handleGetAnswers(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    // Parse query params
    const url = new URL(request.url);
    const examId = url.searchParams.get("examId");

    const parseResult = GetAnswersQuerySchema.safeParse({ examId });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const answers = await getExamAnswers(user.id, parseResult.data.examId);

    return NextResponse.json({ answers });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error fetching answers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
