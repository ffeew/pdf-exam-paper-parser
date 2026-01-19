import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { exams, questions, answerOptions, images } from "@/lib/db/schema";
import { getDownloadUrl } from "@/lib/storage";

export async function getExamStatus(examId: string, userId: string) {
  const exam = await db.query.exams.findFirst({
    where: and(eq(exams.id, examId), eq(exams.userId, userId)),
    columns: {
      id: true,
      status: true,
      errorMessage: true,
    },
  });

  return exam;
}

export async function getExamWithQuestions(examId: string, userId: string) {
  // Fetch the exam with basic info
  const exam = await db.query.exams.findFirst({
    where: and(eq(exams.id, examId), eq(exams.userId, userId)),
  });

  if (!exam) {
    return null;
  }

  // Fetch questions with their options and images
  const examQuestions = await db.query.questions.findMany({
    where: eq(questions.examId, examId),
    orderBy: [asc(questions.orderIndex)],
  });

  // Fetch all answer options for these questions
  const questionIds = examQuestions.map((q) => q.id);
  const allOptions =
    questionIds.length > 0
      ? await db.query.answerOptions.findMany({
          where: (opts, { inArray }) => inArray(opts.questionId, questionIds),
          orderBy: [asc(answerOptions.orderIndex)],
        })
      : [];

  // Fetch all images for these questions
  const allImages =
    questionIds.length > 0
      ? await db.query.images.findMany({
          where: (imgs, { inArray, or, and: dbAnd, eq: dbEq }) =>
            or(
              inArray(imgs.questionId, questionIds),
              dbAnd(dbEq(imgs.examId, examId), dbEq(imgs.questionId, null as unknown as string))
            ),
          orderBy: [asc(images.orderIndex)],
        })
      : [];

  // Generate presigned URLs for all images
  const imagesWithUrls = await Promise.all(
    allImages.map(async (img) => ({
      ...img,
      imageUrl: await getDownloadUrl(img.imageUrl, 3600),
    }))
  );

  // Group options and images by question
  const optionsByQuestion = new Map<string, typeof allOptions>();
  for (const opt of allOptions) {
    const existing = optionsByQuestion.get(opt.questionId) || [];
    existing.push(opt);
    optionsByQuestion.set(opt.questionId, existing);
  }

  const imagesByQuestion = new Map<string, typeof imagesWithUrls>();
  const examLevelImages: typeof imagesWithUrls = [];
  for (const img of imagesWithUrls) {
    if (img.questionId) {
      const existing = imagesByQuestion.get(img.questionId) || [];
      existing.push(img);
      imagesByQuestion.set(img.questionId, existing);
    } else {
      // Exam-level images (not linked to any specific question)
      examLevelImages.push(img);
    }
  }

  // Build the response
  const questionsWithDetails = examQuestions.map((q) => ({
    id: q.id,
    questionNumber: q.questionNumber,
    questionText: q.questionText,
    questionType: q.questionType,
    marks: q.marks,
    section: q.section,
    instructions: q.instructions,
    orderIndex: q.orderIndex,
    options: (optionsByQuestion.get(q.id) || []).map((opt) => ({
      id: opt.id,
      optionLabel: opt.optionLabel,
      optionText: opt.optionText,
      orderIndex: opt.orderIndex,
    })),
    images: (imagesByQuestion.get(q.id) || []).map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      altText: img.altText,
    })),
  }));

  return {
    id: exam.id,
    filename: exam.filename,
    subject: exam.subject,
    grade: exam.grade,
    schoolName: exam.schoolName,
    totalMarks: exam.totalMarks,
    status: exam.status,
    errorMessage: exam.errorMessage,
    createdAt: exam.createdAt.toISOString(),
    questions: questionsWithDetails,
    examImages: examLevelImages.map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      altText: img.altText,
    })),
  };
}
