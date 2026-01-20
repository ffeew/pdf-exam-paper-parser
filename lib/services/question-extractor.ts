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
  pageNumber: z
    .number()
    .describe("The page number where this question appears (1-indexed)"),
  marks: z
    .number()
    .nullable()
    .describe("The number of marks for this question, null if not shown"),
  section: z
    .string()
    .nullable()
    .describe("The section title/name this question belongs to (e.g., '一、辨字测验', 'Section A', 'Part 1'), null if none"),
  sectionInstructions: z
    .string()
    .describe("Section instructions on FIRST question only, empty string for others"),
  instructions: z
    .string()
    .nullable()
    .describe("Question-specific instructions that only apply to THIS question, null if none"),
  options: z
    .array(AnswerOptionSchema)
    .nullable()
    .describe("Answer options for MCQ questions, null for non-MCQ"),
  relatedImageIds: z
    .array(z.string())
    .describe("IDs of images related to this question, empty array if none"),
  expectedAnswer: z
    .string()
    .nullable()
    .describe("The expected answer if visible in the document, null if not shown"),
});

const ExamExtractionSchema = z.object({
  subject: z
    .string()
    .nullable()
    .describe("The subject of the exam (Math, English, Chinese, etc.), null if not found"),
  grade: z.string().nullable().describe("The grade level (e.g., 'Primary 4'), null if not found"),
  schoolName: z.string().nullable().describe("The school name if visible, null if not found"),
  totalMarks: z.number().nullable().describe("The total marks for the exam, null if not found"),
  questions: z.array(QuestionSchema).describe("All questions in the exam"),
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

The document is organized by pages, marked with "--- Page N ---" headers.

For each question:
1. Identify the question number (e.g., "1", "2a", "2b", "3(i)")
2. Extract the question text:
   - **IMPORTANT for MCQs**: Remove inline options from the question text and replace with a blank
   - Chinese MCQ example: "不 (1馆 2管 3官 4观) 怎么说" → questionText: "不______怎么说"
   - The options are extracted separately, so do NOT include them in questionText
   - For English MCQs, do NOT include options A, B, C, D in the question text
3. Determine the question type:
   - "mcq": Multiple choice with options A, B, C, D (or similar)
   - "fill_blank": Fill in the blank questions (has underlined spaces or boxes)
   - "short_answer": Questions requiring a word, number, or short phrase
   - "long_answer": Questions requiring explanation, working, or longer responses
4. **CRITICAL: Identify the page number where the question appears** (look at the "--- Page N ---" header above the question)
5. Extract marks if shown (usually in parentheses like "(2 marks)" or "[2]")
6. Identify sections and their instructions:
   - Section title: The header like "一、辨字测验 (2 题 4 分)", "Section A", or "Part 1"
   - Section instructions: Text that tells students HOW to answer questions in that section
     Example: "从各题所提供的四个选项中，选出正确的答案。" (Choose the correct answer from the four options)
   - **IMPORTANT**: Only include sectionInstructions on the FIRST question of each section
   - Later questions in the same section should have sectionInstructions as empty string ""
   - Chinese format: Look for "一、二、三、四" numbering followed by instruction text
   - English format: Look for "Section A/B/C" or "Part 1/2/3" followed by instruction text
7. For MCQ, extract all options with their labels (A, B, C, D)
8. Extract any question-specific instructions (instructions that only apply to one question, not the whole section)
9. **CRITICAL - Link images to questions**: The markdown contains image references like ![img-0.jpeg](img-0.jpeg).
   - Look for these image references in the markdown text
   - If an image appears within or immediately after a question's text, add its ID to the relatedImageIds array
   - The image ID is the filename part (e.g., "img-0.jpeg", "img-1.jpeg")
   - Only include images that are diagrams, figures, or visual elements relevant to answering the question
   - Do NOT include images that are clearly logos, watermarks, headers, footers, or decorative elements
   - If no images are related to a question, use an empty array []

Also extract metadata about the exam:
- Subject (Math, English, Chinese, Science, etc.)
- Grade level (Primary 1-6)
- School name if visible on the paper
- Total marks if shown

Important notes:
- Be thorough - extract ALL questions from the document
- Preserve the exact question numbering used in the exam
- **Always set the pageNumber field** - this is required for linking images to questions
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
