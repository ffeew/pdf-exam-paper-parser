import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exams, questions, answerOptions, images } from "@/lib/db/schema";
import { uploadBuffer } from "@/lib/storage";
import type { ExtractedExam } from "./question-extractor";
import type { OcrResult } from "./ocr";

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mimeType] || "png";
}

interface UploadedImage {
  key: string;
  pageNumber: number;
}

async function uploadExtractedImages(
  examId: string,
  ocrResult: OcrResult
): Promise<Map<string, UploadedImage>> {
  const imageMap = new Map<string, UploadedImage>();

  for (const page of ocrResult.pages) {
    for (const img of page.images) {
      if (!img.base64) continue;

      // Convert base64 to buffer
      const buffer = Buffer.from(img.base64, "base64");
      const extension = getExtension(img.mimeType);
      const key = `images/${examId}/${img.id}.${extension}`;

      await uploadBuffer(key, buffer, img.mimeType);

      // Store both the key and page number for later association
      imageMap.set(img.id, {
        key,
        pageNumber: img.pageNumber,
      });
    }
  }

  return imageMap;
}

export async function saveExtractedData(
  examId: string,
  extracted: ExtractedExam,
  ocrResult: OcrResult
) {
  // Update exam metadata
  await db
    .update(exams)
    .set({
      subject: extracted.subject,
      grade: extracted.grade,
      schoolName: extracted.schoolName,
      totalMarks: extracted.totalMarks,
      updatedAt: new Date(),
    })
    .where(eq(exams.id, examId));

  // Upload extracted images to R2 and get their keys + page numbers
  const imageMap = await uploadExtractedImages(examId, ocrResult);

  // Build a map of pageNumber → questionIds for page-based image association
  const pageToQuestionIds = new Map<number, string[]>();
  const questionIdToPage = new Map<string, number>();

  // Insert questions and build page mappings
  for (let i = 0; i < extracted.questions.length; i++) {
    const q = extracted.questions[i];
    const questionId = randomUUID();
    const now = new Date();

    await db.insert(questions).values({
      id: questionId,
      examId,
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      questionType: q.questionType,
      marks: q.marks,
      section: q.section,
      instructions: q.instructions,
      expectedAnswer: q.expectedAnswer,
      orderIndex: i,
      createdAt: now,
    });

    // Track page → question mapping
    if (q.pageNumber) {
      const existing = pageToQuestionIds.get(q.pageNumber) || [];
      existing.push(questionId);
      pageToQuestionIds.set(q.pageNumber, existing);
      questionIdToPage.set(questionId, q.pageNumber);
    }

    // Insert answer options for MCQ
    if (q.questionType === "mcq" && q.options) {
      for (let j = 0; j < q.options.length; j++) {
        const opt = q.options[j];
        await db.insert(answerOptions).values({
          id: randomUUID(),
          questionId,
          optionLabel: opt.label,
          optionText: opt.text,
          isCorrect: opt.isCorrect,
          orderIndex: j,
        });
      }
    }
  }

  // Associate images with questions by page number
  for (const [imageId, uploadedImage] of imageMap) {
    const { key: imageKey, pageNumber } = uploadedImage;
    const questionsOnPage = pageToQuestionIds.get(pageNumber);

    if (questionsOnPage && questionsOnPage.length > 0) {
      // Link image to the first question on that page
      // (Could also duplicate to all questions on the page if preferred)
      const questionId = questionsOnPage[0];
      await db.insert(images).values({
        id: randomUUID(),
        examId,
        questionId,
        imageUrl: imageKey,
        imageType: "question_diagram",
        orderIndex: 0,
        createdAt: new Date(),
      });
    } else {
      // No questions on this page - save as exam-level image
      await db.insert(images).values({
        id: randomUUID(),
        examId,
        questionId: null,
        imageUrl: imageKey,
        imageType: "exam_content",
        orderIndex: 0,
        createdAt: new Date(),
      });
    }
  }
}
