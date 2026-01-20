import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getExamWithQuestions, getExamStatus } from "./service";

export async function handleGetExam(_request: NextRequest, examId: string) {
  try {
    const authResult = await requireAuth();
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const exam = await getExamWithQuestions(examId, user.id);
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json(exam);
  } catch (error) {
    console.error("Error fetching exam:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function handleGetExamStatus(_request: NextRequest, examId: string) {
  try {
    const authResult = await requireAuth();
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const status = await getExamStatus(examId, user.id);
    if (!status) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching exam status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
