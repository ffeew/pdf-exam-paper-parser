import { db } from "@/lib/db";
import { userAnswers } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { verifyExamOwnership } from "@/lib/services/authorization";
import { gradeAnswer } from "../grade/service";
import type { AIModel, GradeResult } from "../grade/validator";
import type { GradeExamResponse } from "./validator";

export async function gradeExam(
  userId: string,
  examId: string,
  model: AIModel
): Promise<GradeExamResponse> {
  // Verify user owns this exam
  await verifyExamOwnership(examId, userId);

  // Get all ungraded or pending answers for this exam
  const answersToGrade = await db.query.userAnswers.findMany({
    where: and(
      eq(userAnswers.examId, examId),
      eq(userAnswers.userId, userId),
      ne(userAnswers.gradingStatus, "graded")
    ),
  });

  // Also get already graded answers for summary
  const gradedAnswers = await db.query.userAnswers.findMany({
    where: and(
      eq(userAnswers.examId, examId),
      eq(userAnswers.userId, userId),
      eq(userAnswers.gradingStatus, "graded")
    ),
  });

  const results: GradeResult[] = [];
  let failedCount = 0;

  // Grade each answer sequentially to avoid rate limiting
  for (const answer of answersToGrade) {
    // Skip if no answer provided
    if (!answer.answerText && !answer.selectedOptionId) {
      continue;
    }

    try {
      const result = await gradeAnswer(
        userId,
        examId,
        answer.questionId,
        model
      );
      results.push(result);
    } catch (error) {
      console.error(`Failed to grade question ${answer.questionId}:`, error);
      failedCount++;
    }
  }

  // Calculate summary including previously graded answers
  const allGradedResults = [
    ...results,
    ...gradedAnswers.map((a) => ({
      questionId: a.questionId,
      isCorrect: a.isCorrect ?? false,
      score: a.score ?? 0,
      maxScore: a.maxScore ?? 1,
      feedback: a.feedback ?? "",
      gradingModel: a.gradingModel ?? "",
      gradedAt: a.gradedAt?.toISOString() ?? new Date().toISOString(),
    })),
  ];

  const totalScore = allGradedResults.reduce((sum, r) => sum + r.score, 0);
  const maxPossibleScore = allGradedResults.reduce(
    (sum, r) => sum + r.maxScore,
    0
  );

  return {
    results,
    summary: {
      total: answersToGrade.length,
      graded: results.length,
      failed: failedCount,
      totalScore,
      maxPossibleScore,
    },
  };
}
