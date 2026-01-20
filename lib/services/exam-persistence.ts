import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exams, questions, answerOptions, images } from "@/lib/db/schema";
import { uploadBuffer } from "@/lib/storage";
import type { ExtractedExam } from "./question-extractor";
import type { OcrResult } from "./ocr";
import type { AnswerKeyResult } from "./answer-key-validator";
import { classifyByPosition, classifyWithVisionLLM } from "./image-classifier";

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

      // Classify image to filter out administrative elements (score boxes, logos, etc.)
      let classification = classifyByPosition(img);

      // For medium/low confidence, use vision LLM for verification
      if (classification.confidence !== "high") {
        console.log(
          `[${examId}] Position heuristics uncertain for ${img.id} (${classification.confidence}), using vision LLM...`
        );
        classification = await classifyWithVisionLLM(img);
        console.log(
          `[${examId}] Vision LLM result for ${img.id}: ${classification.classification} (${classification.confidence}) - ${classification.reason}`
        );
      }

      // Skip administrative images with high confidence
      if (
        classification.classification === "administrative" &&
        classification.confidence === "high"
      ) {
        console.log(
          `[${examId}] Skipping administrative image: ${img.id} (${classification.reason})`
        );
        continue;
      }

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
  ocrResult: OcrResult,
  answerKey?: AnswerKeyResult
) {
  // Update exam metadata (including answer key info if present)
  await db
    .update(exams)
    .set({
      subject: extracted.subject,
      grade: extracted.grade,
      schoolName: extracted.schoolName,
      totalMarks: extracted.totalMarks,
      hasAnswerKey: answerKey?.found ?? false,
      answerKeyConfidence: answerKey?.found ? answerKey.confidence : null,
      updatedAt: new Date(),
    })
    .where(eq(exams.id, examId));

  // Upload extracted images to R2 and get their keys + page numbers
  const imageMap = await uploadExtractedImages(examId, ocrResult);

  // Map from extraction index to database questionId
  const questionIdByIndex = new Map<number, string>();

  // Insert questions and track their IDs
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
      sectionInstructions: q.sectionInstructions || null,
      context: q.context || null,
      expectedAnswer: q.expectedAnswer,
      orderIndex: i,
      createdAt: now,
    });

    // Store mapping for image association
    questionIdByIndex.set(i, questionId);

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

  // Associate images with questions using relatedImageIds from LLM extraction
  const associatedImageIds = new Set<string>();

  for (let i = 0; i < extracted.questions.length; i++) {
    const q = extracted.questions[i];
    const questionId = questionIdByIndex.get(i)!;

    // Link each related image to this question
    for (let orderIdx = 0; orderIdx < q.relatedImageIds.length; orderIdx++) {
      const imageId = q.relatedImageIds[orderIdx];
      const uploadedImage = imageMap.get(imageId);
      if (!uploadedImage) continue;

      await db.insert(images).values({
        id: randomUUID(),
        examId,
        questionId,
        imageUrl: uploadedImage.key,
        imageType: "question_diagram",
        orderIndex: orderIdx,
        createdAt: new Date(),
      });
      associatedImageIds.add(imageId);
    }
  }

  // Remaining images (not claimed by any question) become exam-level images
  let examImageOrder = 0;
  for (const [imageId, uploadedImage] of imageMap) {
    if (associatedImageIds.has(imageId)) continue;

    await db.insert(images).values({
      id: randomUUID(),
      examId,
      questionId: null,
      imageUrl: uploadedImage.key,
      imageType: "exam_content",
      orderIndex: examImageOrder++,
      createdAt: new Date(),
    });
  }

  // Link answers from answer key to questions
  if (answerKey?.found && answerKey.entries.length > 0) {
    await linkAnswersToQuestions(
      extracted.questions,
      questionIdByIndex,
      answerKey
    );
  }
}

/**
 * Links answers from the answer key to the corresponding questions in the database.
 */
async function linkAnswersToQuestions(
  extractedQuestions: ExtractedExam["questions"],
  questionIdByIndex: Map<number, string>,
  answerKey: AnswerKeyResult
) {
  // Build a map of question number -> answer key entry
  const answerMap = new Map(
    answerKey.entries.map((entry) => [
      normalizeQuestionNumber(entry.questionNumber),
      entry,
    ])
  );

  for (let i = 0; i < extractedQuestions.length; i++) {
    const q = extractedQuestions[i];
    const questionId = questionIdByIndex.get(i);
    if (!questionId) continue;

    const normalizedQNum = normalizeQuestionNumber(q.questionNumber);
    const answerEntry = answerMap.get(normalizedQNum);
    if (!answerEntry) continue;

    if (answerEntry.answerType === "mcq_option" && q.questionType === "mcq") {
      // For MCQ: Update the correct option's isCorrect field
      const normalizedAnswer = answerEntry.answer.toUpperCase().trim();
      await db
        .update(answerOptions)
        .set({ isCorrect: true })
        .where(
          and(
            eq(answerOptions.questionId, questionId),
            eq(answerOptions.optionLabel, normalizedAnswer)
          )
        );
    } else {
      // For non-MCQ: Update the expectedAnswer field
      await db
        .update(questions)
        .set({ expectedAnswer: answerEntry.answer })
        .where(eq(questions.id, questionId));
    }
  }
}

/**
 * Normalizes question numbers for matching.
 * Handles variations like "1", "1.", "Q1", "Qn 1", "1a", "1(a)", etc.
 */
function normalizeQuestionNumber(qNum: string): string {
  return qNum
    .toLowerCase()
    .replace(/^(q|qn|question)\.?\s*/i, "") // Remove Q/Qn/Question prefix
    .replace(/[\(\)\.\s]/g, "") // Remove parentheses, dots, spaces
    .trim();
}
