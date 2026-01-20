import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { exams, sections, questions, answerOptions, images } from "@/lib/db/schema";
import { getDownloadUrl } from "@/lib/storage";
import { replaceMarkdownImageUrls } from "@/lib/utils/markdown";

export async function getExamStatus(examId: string, userId: string) {
  const exam = await db.query.exams.findFirst({
    where: and(eq(exams.id, examId), eq(exams.userId, userId)),
    columns: {
      id: true,
      status: true,
      progress: true,
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

  // Fetch sections for this exam
  const examSections = await db.query.sections.findMany({
    where: eq(sections.examId, examId),
    orderBy: [asc(sections.orderIndex)],
  });

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

  // Fetch all images for this exam (both question-linked and exam-level)
  const allImages = await db.query.images.findMany({
    where: eq(images.examId, examId),
    orderBy: [asc(images.orderIndex)],
  });

  // Generate presigned URLs for all images, preserving original R2 key for mapping
  // Use Promise.allSettled for graceful degradation - don't fail entire request for one bad image
  const imageResults = await Promise.allSettled(
    allImages.map(async (img) => ({
      ...img,
      originalKey: img.imageUrl, // Keep the R2 key for OCR image ID mapping
      imageUrl: await getDownloadUrl(img.imageUrl, 3600),
    }))
  );

  // Filter to only successfully processed images, log failures
  const imagesWithUrls = imageResults
    .filter(
      (result): result is PromiseFulfilledResult<(typeof allImages)[0] & { originalKey: string }> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value);

  // Log any failed image URL generations for debugging
  imageResults
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .forEach((result) => {
      console.error("Failed to generate presigned URL for image:", result.reason);
    });

  // Build OCR image ID to presigned URL map for section instruction images
  const imageIdToUrl = new Map<string, string>();
  for (const img of imagesWithUrls) {
    // Extract OCR image ID from R2 key: "images/{examId}/img-1.jpeg.png" -> "img-1.jpeg"
    const filename = img.originalKey.split("/").pop() || "";
    // Remove extension that was added during upload (e.g., ".png" from "img-1.jpeg.png")
    const ocrId = filename.replace(/\.(png|jpg|jpeg|webp|gif)$/i, "");
    imageIdToUrl.set(ocrId, img.imageUrl);
  }

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
    sectionId: q.sectionId,
    context: q.context,
    expectedAnswer: q.expectedAnswer,
    orderIndex: q.orderIndex,
    options: (optionsByQuestion.get(q.id) || []).map((opt) => ({
      id: opt.id,
      optionLabel: opt.optionLabel,
      optionText: opt.optionText,
      orderIndex: opt.orderIndex,
      isCorrect: opt.isCorrect,
    })),
    images: (imagesByQuestion.get(q.id) || []).map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      altText: img.altText,
    })),
  }));

  // Parse raw OCR result to build document markdown
  let documentMarkdown: string | null = null;
  if (exam.rawOcrResult) {
    try {
      const rawOcr = JSON.parse(exam.rawOcrResult);
      if (rawOcr?.pages && Array.isArray(rawOcr.pages)) {
        // Parse answer key page numbers to filter them out
        const answerKeyPages: number[] = exam.answerKeyPageNumbers
          ? JSON.parse(exam.answerKeyPageNumbers)
          : [];

        // Filter out answer key pages
        const questionPages = rawOcr.pages.filter(
          (page: { pageNumber?: number }, idx: number) => {
            const pageNum = page.pageNumber ?? idx + 1;
            return !answerKeyPages.includes(pageNum);
          }
        );

        const fullMarkdown = questionPages
          .map(
            (page: { markdown?: string; pageNumber?: number }, idx: number) =>
              `---\n\n**Page ${page.pageNumber ?? idx + 1}**\n\n---\n\n${page.markdown || ""}`
          )
          .join("\n\n");

        documentMarkdown = replaceMarkdownImageUrls(fullMarkdown, imageIdToUrl);
      }
    } catch {
      // If parsing fails, leave documentMarkdown as null
    }
  }

  return {
    id: exam.id,
    filename: exam.filename,
    subject: exam.subject,
    grade: exam.grade,
    schoolName: exam.schoolName,
    totalMarks: exam.totalMarks,
    status: exam.status,
    errorMessage: exam.errorMessage,
    hasAnswerKey: exam.hasAnswerKey,
    answerKeyConfidence: exam.answerKeyConfidence,
    createdAt: exam.createdAt.toISOString(),
    sections: examSections.map((s) => ({
      id: s.id,
      sectionName: s.sectionName,
      instructions: s.instructions
        ? replaceMarkdownImageUrls(s.instructions, imageIdToUrl)
        : null,
      orderIndex: s.orderIndex,
    })),
    questions: questionsWithDetails,
    examImages: examLevelImages.map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      altText: img.altText,
    })),
    documentMarkdown,
  };
}
