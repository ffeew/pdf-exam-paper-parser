import { generateText, Output } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { env } from "@/lib/config/env";
import type { OcrPage } from "./ocr";

const groq = createGroq({
  apiKey: env.GROQ_API_KEY,
});

const AnswerOptionSchema = z.object({
  label: z.string().describe("Option label like A, B, C, D"),
  text: z.string().describe("The option text"),
  isCorrect: z
    .boolean()
    .nullable()
    .optional()
    .describe("Whether this is the correct answer, null if unknown"),
});

const QuestionSchema = z.object({
  questionNumber: z
    .string()
    .describe("The question number (e.g., '1', '2a', '2b')"),
  questionText: z.string().describe("The full question text"),
  questionType: z
    .enum(["mcq", "fill_blank", "short_answer", "long_answer"])
    .describe("The type of question"),
  marks: z
    .number()
    .nullable()
    .optional()
    .describe("The number of marks for this question"),
  section: z
    .string()
    .nullable()
    .optional()
    .describe("The section this question belongs to"),
  instructions: z
    .string()
    .nullable()
    .optional()
    .describe("Any special instructions for this question"),
  options: z
    .array(AnswerOptionSchema)
    .nullable()
    .optional()
    .describe("Answer options for MCQ questions"),
  relatedImageIds: z
    .array(z.string())
    .optional()
    .default([])
    .describe("IDs of images related to this question"),
  expectedAnswer: z
    .string()
    .nullable()
    .optional()
    .describe("The expected answer if visible in the document"),
});

const ExamExtractionSchema = z.object({
  subject: z
    .string()
    .nullable()
    .optional()
    .describe("The subject of the exam (Math, English, Chinese, etc.)"),
  grade: z.string().nullable().optional().describe("The grade level (e.g., 'Primary 4')"),
  schoolName: z.string().nullable().optional().describe("The school name if visible"),
  totalMarks: z.number().nullable().optional().describe("The total marks for the exam"),
  questions: z.array(QuestionSchema).default([]).describe("All questions in the exam"),
});

export type ExtractedExam = z.infer<typeof ExamExtractionSchema>;
export type ExtractedQuestion = z.infer<typeof QuestionSchema>;

export async function extractQuestionsWithLlm(
  pages: OcrPage[]
): Promise<ExtractedExam> {
  // Combine all pages into a single markdown document
  const fullDocument = pages
    .map((p) => {
      const imageRefs = p.images.map((img) => `[Image: ${img.id}]`).join("\n");
      return `--- Page ${p.pageNumber} ---\n${p.markdown}\n${imageRefs ? `\nImages on this page:\n${imageRefs}` : ""}`;
    })
    .join("\n\n");

  const { output } = await generateText({
    model: groq("openai/gpt-oss-120b"),
    output: Output.object({ schema: ExamExtractionSchema }),
    prompt: `You are an expert at extracting structured information from exam papers.

Analyze the following OCR output from a Singapore Primary school exam paper and extract all questions.

For each question:
1. Identify the question number (e.g., "1", "2a", "2b", "3(i)")
2. Extract the full question text
3. Determine the question type:
   - "mcq": Multiple choice with options A, B, C, D (or similar)
   - "fill_blank": Fill in the blank questions (has underlined spaces or boxes)
   - "short_answer": Questions requiring a word, number, or short phrase
   - "long_answer": Questions requiring explanation, working, or longer responses
4. Extract marks if shown (usually in parentheses like "(2 marks)" or "[2]")
5. Identify the section if the exam is divided into sections (Section A, B, etc.)
6. For MCQ, extract all options with their labels (A, B, C, D)
7. If an image is referenced near a question (like a diagram, graph, or picture), include its ID in relatedImageIds
8. Extract any special instructions for the question

Also extract metadata about the exam:
- Subject (Math, English, Chinese, Science, etc.)
- Grade level (Primary 1-6)
- School name if visible on the paper
- Total marks if shown

Important notes:
- Be thorough - extract ALL questions from the document
- Preserve the exact question numbering used in the exam
- For fill-in-the-blank questions, include the blanks in the question text using underscores (e.g., "The capital of France is _____")
- If you can't determine something, use null

Here is the document:

${fullDocument}`,
  });

  if (!output) {
    throw new Error("Failed to extract exam data from document");
  }

  return output;
}
