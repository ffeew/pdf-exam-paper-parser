import { db } from "@/lib/db";
import { exams, questions } from "@/lib/db/schema";
import { eq, count, desc, sql } from "drizzle-orm";
import type { ListExamsQuery, ExamListItem } from "./validator";

export async function listExams(
  userId: string,
  query: ListExamsQuery
): Promise<{ exams: ExamListItem[]; total: number }> {
  // Get total count for pagination
  const [{ total }] = await db
    .select({ total: count() })
    .from(exams)
    .where(eq(exams.userId, userId));

  // Get exams with question count using a subquery
  const examList = await db
    .select({
      id: exams.id,
      filename: exams.filename,
      subject: exams.subject,
      grade: exams.grade,
      schoolName: exams.schoolName,
      status: exams.status,
      createdAt: exams.createdAt,
      questionCount: sql<number>`(
        SELECT COUNT(*) FROM ${questions} WHERE ${questions.examId} = ${exams.id}
      )`.as("questionCount"),
    })
    .from(exams)
    .where(eq(exams.userId, userId))
    .orderBy(desc(exams.createdAt))
    .limit(query.limit)
    .offset(query.offset);

  return {
    exams: examList.map((exam) => ({
      ...exam,
      createdAt: exam.createdAt.toISOString(),
      questionCount: Number(exam.questionCount),
    })),
    total,
  };
}
