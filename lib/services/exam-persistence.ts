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

async function uploadExtractedImages(
  examId: string,
  ocrResult: OcrResult
): Promise<Map<string, string>> {
  const imageKeyMap = new Map<string, string>();

  for (const page of ocrResult.pages) {
    for (const img of page.images) {
      if (!img.base64) continue;

      // Convert base64 to buffer
      const buffer = Buffer.from(img.base64, "base64");
      const extension = getExtension(img.mimeType);
      const key = `images/${examId}/${img.id}.${extension}`;

      await uploadBuffer(key, buffer, img.mimeType);

      // Store the key (we'll generate download URLs on demand)
      imageKeyMap.set(img.id, key);
    }
  }

  return imageKeyMap;
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

  // Upload extracted images to R2 and get their keys
  const imageKeyMap = await uploadExtractedImages(examId, ocrResult);

  // Insert questions
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

    // Insert images associated with this question
    for (const imageId of q.relatedImageIds) {
      const imageKey = imageKeyMap.get(imageId);
      if (imageKey) {
        await db.insert(images).values({
          id: randomUUID(),
          examId,
          questionId,
          imageUrl: imageKey, // Store the R2 key, not the full URL
          imageType: "question_diagram",
          orderIndex: 0,
          createdAt: now,
        });
      }
    }
  }

  // Also save any images not associated with specific questions (exam-level images)
  const usedImageIds = new Set(
    extracted.questions.flatMap((q) => q.relatedImageIds)
  );
  for (const [imageId, imageKey] of imageKeyMap) {
    if (!usedImageIds.has(imageId)) {
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
