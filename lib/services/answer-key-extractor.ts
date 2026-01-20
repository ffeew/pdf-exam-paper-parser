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

  const systemPrompt = `You are an expert at analyzing exam papers. Your task is to determine if pages contain an ANSWER KEY section.

An answer key is a section that provides the correct answers to exam questions. It is different from the questions themselves.

Characteristics of an ANSWER KEY:
1. Contains ONLY answers, NOT full question text
2. Typically has dense sequences of question numbers paired with short answers
3. May have headers like "Answer Key", "Answers", "Model Answers", "Suggested Answers", "答案", "参考答案", etc.
4. Content would NOT make sense as questions (just numbers + letters like "1. A" or "1-B")
5. Usually appears at the end of exam papers
6. May be in table format or list format

Characteristics that are NOT an answer key:
- Multiple choice questions with options A, B, C, D (these are questions, not answers)
- Fill-in-the-blank questions with underlines
- Questions asking students to select an answer

You must determine:
1. Is there an answer key section? (hasAnswerKey)
2. Which page number(s) contain the answer key? (answerKeyPageNumbers)
3. How confident are you? (confidence: high/medium/low)
4. Why did you reach this conclusion? (reason)`;

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

  const systemPrompt = `You are an expert at extracting answer keys from exam papers.

For each answer, extract:
1. questionNumber: The question number exactly as shown (e.g., "1", "2a", "2(i)", "Section A Q1")
2. answer: The correct answer
   - For MCQ: Just the letter (e.g., "A", "B", "C", "D")
   - For other types: The actual answer text (e.g., "24", "$15.50", "Singapore", "noun")
3. answerType:
   - "mcq_option" if the answer is a single letter A-D (or A-E)
   - "text" for any other type of answer

Important:
- Extract ALL answers, even if the format is inconsistent
- Preserve the exact question numbering used (don't normalize)
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
