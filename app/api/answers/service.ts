import { db } from "@/lib/db";
import { userAnswers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyExamOwnership } from "@/lib/services/authorization";
import type { UserAnswer } from "./validator";

function formatAnswer(answer: typeof userAnswers.$inferSelect): UserAnswer {
  return {
    id: answer.id,
    questionId: answer.questionId,
    answerText: answer.answerText,
    selectedOptionId: answer.selectedOptionId,
    isCorrect: answer.isCorrect,
    score: answer.score,
    maxScore: answer.maxScore,
    feedback: answer.feedback,
    gradingStatus: answer.gradingStatus as UserAnswer["gradingStatus"],
    gradingModel: answer.gradingModel,
    gradedAt: answer.gradedAt?.toISOString() ?? null,
    submittedAt: answer.submittedAt.toISOString(),
    updatedAt: answer.updatedAt.toISOString(),
  };
}

export async function submitAnswer(
  userId: string,
  examId: string,
  questionId: string,
  answerText: string | null,
  selectedOptionId: string | null
): Promise<UserAnswer> {
  // Verify user owns this exam
  await verifyExamOwnership(examId, userId);

  const now = new Date();

  // Check if answer already exists
  const existing = await db.query.userAnswers.findFirst({
    where: and(
      eq(userAnswers.questionId, questionId),
      eq(userAnswers.userId, userId)
    ),
  });

  if (existing) {
    // Update existing answer
    const [updated] = await db
      .update(userAnswers)
      .set({
        answerText,
        selectedOptionId,
        // Reset grading status when answer changes
        gradingStatus: "pending",
        isCorrect: null,
        score: null,
        feedback: null,
        gradedAt: null,
        updatedAt: now,
      })
      .where(eq(userAnswers.id, existing.id))
      .returning();

    return formatAnswer(updated);
  }

  // Create new answer
  const id = crypto.randomUUID();
  const [created] = await db
    .insert(userAnswers)
    .values({
      id,
      userId,
      examId,
      questionId,
      answerText,
      selectedOptionId,
      gradingStatus: "pending",
      submittedAt: now,
      updatedAt: now,
    })
    .returning();

  return formatAnswer(created);
}

export async function getExamAnswers(
  userId: string,
  examId: string
): Promise<UserAnswer[]> {
  // Verify user owns this exam
  await verifyExamOwnership(examId, userId);

  const answers = await db.query.userAnswers.findMany({
    where: and(
      eq(userAnswers.examId, examId),
      eq(userAnswers.userId, userId)
    ),
  });

  return answers.map(formatAnswer);
}

export async function getAnswer(
  userId: string,
  questionId: string
): Promise<UserAnswer | null> {
  const answer = await db.query.userAnswers.findFirst({
    where: and(
      eq(userAnswers.questionId, questionId),
      eq(userAnswers.userId, userId)
    ),
  });

  return answer ? formatAnswer(answer) : null;
}
