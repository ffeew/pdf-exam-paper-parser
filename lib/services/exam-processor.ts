import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exams } from "@/lib/db/schema";
import { processDocumentWithOcr } from "./ocr";
import { extractQuestionsWithLlm } from "./question-extractor";
import { extractAnswerKey } from "./answer-key-extractor";
import { saveExtractedData } from "./exam-persistence";

export async function processExamAsync(examId: string, fileKey: string) {
  try {
    // Update status to processing
    await db
      .update(exams)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(exams.id, examId));

    // Step 1: OCR - Extract text and images from PDF
    console.log(`[${examId}] Starting OCR processing...`);
    const ocrResult = await processDocumentWithOcr(fileKey);
    console.log(
      `[${examId}] OCR completed. Extracted ${ocrResult.pages.length} pages.`
    );

    // Save raw OCR result for debugging/reference
    await db
      .update(exams)
      .set({ rawOcrResult: ocrResult.rawJson, updatedAt: new Date() })
      .where(eq(exams.id, examId));

    // Step 2: LLM extraction - Parse OCR output into structured questions
    console.log(`[${examId}] Starting LLM extraction...`);
    const extractedExam = await extractQuestionsWithLlm(ocrResult.pages);
    console.log(
      `[${examId}] LLM extraction completed. Found ${extractedExam.questions.length} questions.`
    );

    // Step 3: Answer key extraction - Check for and extract answer key
    console.log(`[${examId}] Checking for answer key...`);
    const answerKeyResult = await extractAnswerKey(ocrResult.pages);
    if (answerKeyResult.found) {
      console.log(
        `[${examId}] Answer key found with ${answerKeyResult.entries.length} entries (confidence: ${answerKeyResult.confidence}).`
      );
    } else {
      console.log(`[${examId}] No answer key detected.`);
    }

    // Step 4: Save to database
    console.log(`[${examId}] Saving extracted data to database...`);
    await saveExtractedData(examId, extractedExam, ocrResult, answerKeyResult);

    // Mark as completed
    await db
      .update(exams)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(exams.id, examId));

    console.log(`[${examId}] Processing completed successfully.`);
  } catch (error) {
    console.error(`[${examId}] Processing failed:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    await db
      .update(exams)
      .set({
        status: "failed",
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(exams.id, examId));

    throw error;
  }
}
