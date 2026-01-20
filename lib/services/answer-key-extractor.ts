import { generateText, Output } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { env } from "@/lib/config/env";
import type { OcrPage } from "./ocr";
import {
  AnswerKeyDetectionSchema,
  AnswerKeyExtractionSchema,
  type AnswerKeyResult,
  type AnswerKeyDetection,
  type AnswerKeyExtraction,
} from "./answer-key-validator";

const groq = createGroq({
  apiKey: env.GROQ_API_KEY,
});

/**
 * Extracts answer key from exam paper pages using a two-pass LLM approach.
 *
 * Pass 1: Detection - Determine if an answer key exists in the last few pages
 * Pass 2: Extraction - If detected, extract all Q-A pairs
 */
export async function extractAnswerKey(
  pages: OcrPage[]
): Promise<AnswerKeyResult> {
  // Analyze last 4 pages (or fewer if document is shorter)
  const pagesToAnalyze = pages.slice(-4);

  // Pass 1: Detect if answer key exists
  const detection = await detectAnswerKey(pagesToAnalyze);

  if (!detection.hasAnswerKey) {
    return {
      found: false,
      entries: [],
      confidence: detection.confidence,
      sourcePageNumbers: [],
    };
  }

  // Pass 2: Extract answers from detected pages
  const answerKeyPages = pages.filter((p) =>
    detection.answerKeyPageNumbers.includes(p.pageNumber)
  );

  if (answerKeyPages.length === 0) {
    return {
      found: false,
      entries: [],
      confidence: "low",
      sourcePageNumbers: [],
    };
  }

  const extraction = await extractAnswersFromPages(answerKeyPages);

  return {
    found: true,
    entries: extraction.entries,
    confidence: detection.confidence,
    sourcePageNumbers: detection.answerKeyPageNumbers,
  };
}

/**
 * Pass 1: Detect if an answer key section exists in the given pages.
 */
async function detectAnswerKey(pages: OcrPage[]): Promise<AnswerKeyDetection> {
  const pagesContent = pages
    .map((p) => `--- Page ${p.pageNumber} ---\n${p.markdown}`)
    .join("\n\n");

  const systemPrompt = `Detect if these pages contain an ANSWER KEY section.

ANSWER KEY characteristics:
- Contains ONLY answers, NOT full question text
- Dense sequences: question numbers paired with short answers (e.g., "1. A", "2-B")
- Headers like "Answer Key", "Answers", "Model Answers", "答案", "参考答案"
- Usually at end of exam papers, in table or list format

NOT an answer key:
- MCQ questions with options A, B, C, D (these are questions)
- Fill-in-the-blank questions with underlines`;

  const { output } = await generateText({
    model: groq("moonshotai/kimi-k2-instruct-0905"),
    temperature: 0.1,
    maxRetries: 3,
    system: systemPrompt,
    output: Output.object({ schema: AnswerKeyDetectionSchema }),
    prompt: `Analyze these pages to detect if there is an answer key section:

${pagesContent}`,
  });

  if (!output) {
    return {
      hasAnswerKey: false,
      answerKeyPageNumbers: [],
      confidence: "low",
      reason: "Failed to analyze pages for answer key",
    };
  }

  return output;
}

/**
 * Pass 2: Extract Q-A pairs from pages known to contain an answer key.
 */
async function extractAnswersFromPages(
  pages: OcrPage[]
): Promise<AnswerKeyExtraction> {
  const pagesContent = pages
    .map((p) => `--- Page ${p.pageNumber} ---\n${p.markdown}`)
    .join("\n\n");

  const systemPrompt = `Extract ALL question-answer pairs from this answer key.

Rules:
- Preserve exact question numbering (don't normalize)
- Handle any format: tables, lists, inline, scattered
- Handle any language (English, Chinese, bilingual)`;

  const { output } = await generateText({
    model: groq("moonshotai/kimi-k2-instruct-0905"),
    temperature: 0.1,
    maxRetries: 3,
    system: systemPrompt,
    output: Output.object({ schema: AnswerKeyExtractionSchema }),
    prompt: `Extract ALL question-answer pairs from these answer key pages:

${pagesContent}`,
  });

  if (!output) {
    return { entries: [] };
  }

  return output;
}
