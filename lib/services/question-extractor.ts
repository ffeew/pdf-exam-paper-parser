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

  const systemPrompt = `You are an expert at extracting structured information from exam papers. You will receive OCR output from Singapore Primary school exam papers and must extract all questions into a structured JSON format.

The document is organized by pages, marked with "--- Page N ---" headers.

For each question:
1. Identify the question number (e.g., "1", "2a", "2b", "3(i)")
2. Extract the question text:
   - IMPORTANT for MCQs: Remove inline options from the question text and replace with a blank
   - Chinese MCQ example: "不 (1馆 2管 3官 4观) 怎么说" → questionText: "不______怎么说"
   - The options are extracted separately, so do NOT include them in questionText
   - For English MCQs, do NOT include options A, B, C, D in the question text
3. Determine the question type:
   - "mcq": Multiple choice with options A, B, C, D (or similar)
   - "fill_blank": Fill in the blank questions (has underlined spaces or boxes)
   - "short_answer": Questions requiring a word, number, or short phrase
   - "long_answer": Questions requiring explanation, working, or longer responses
4. CRITICAL: Identify the page number where the question appears (look at the "--- Page N ---" header above the question)
5. Extract marks if shown (usually in parentheses like "(2 marks)" or "[2]")
6. Identify sections and their instructions:
   - Section title: The header like "一、辨字测验 (2 题 4 分)", "Section A", or "Part 1"
   - Section instructions: Text that tells students HOW to answer questions in that section
     Example: "从各题所提供的四个选项中，选出正确的答案。" (Choose the correct answer from the four options)
   - IMPORTANT: Only include sectionInstructions on the FIRST question of each section
   - Later questions in the same section should have sectionInstructions as empty string ""
   - Chinese format: Look for "一、二、三、四" numbering followed by instruction text
   - English format: Look for "Section A/B/C" or "Part 1/2/3" followed by instruction text
7. For MCQ, extract all options with their labels (A, B, C, D)
8. Extract any question-specific instructions (instructions that only apply to one question, not the whole section)
9. CRITICAL - Link images to questions: The markdown contains image references like ![img-0.jpeg](img-0.jpeg).
   - Look for these image references in the markdown text
   - If an image appears within or immediately after a question's text, add its ID to the relatedImageIds array
   - The image ID is the filename part (e.g., "img-0.jpeg", "img-1.jpeg")
   - Only include images that are diagrams, figures, or visual elements relevant to answering the question
   - Do NOT include images that are clearly logos, watermarks, headers, footers, or decorative elements
   - If no images are related to a question, use an empty array []
10. CRITICAL - Include all shared context in sectionInstructions:
   - sectionInstructions should contain ALL information students need to answer questions in that section
   - This includes: word banks, answer options, reference tables, reading passages, formulas, or any other shared content

   READING COMPREHENSION PASSAGES:
   - For comprehension sections, you MUST include the COMPLETE passage text in sectionInstructions
   - Do NOT summarize or excerpt - include the ENTIRE passage word-for-word
   - Students cannot answer comprehension questions without the full passage
   - Example: If the passage is about "Ming and his friends playing near the river bank", include EVERY paragraph of that passage

   OTHER SHARED CONTENT:
   - Word banks: Include all options, e.g., "(A) he, (B) it, (C) she, (D) they"
   - Reference tables: Include the complete table data
   - Cloze passages: Include the full text with blanks

   - The goal is that a student should be able to answer any question using only the questionText + sectionInstructions

11. CRITICAL - Handle parent questions with sub-parts correctly:
   - When a question has sub-parts (e.g., 21i, 21ii, 21iii or 3a, 3b, 3c), extract them as separate questions
   - The PARENT question text should go in sectionInstructions of the FIRST sub-question only
   - Each sub-question's questionText should contain ONLY its specific instruction, NOT the parent text

   EXAMPLE - Question 21 with parts i, ii, iii:
   Original: "21. List three toys that Ming and his friends made out of recyclable materials. [3 marks]
              (i) _________ (ii) _________ (iii) _________"

   CORRECT extraction:
   - Question 21i: questionText = "List the first toy." | sectionInstructions = "List three toys that Ming and his friends made out of recyclable materials."
   - Question 21ii: questionText = "List the second toy." | sectionInstructions = ""
   - Question 21iii: questionText = "List the third toy." | sectionInstructions = ""

   WRONG extraction (DO NOT do this):
   - Question 21i: questionText = "List the first toy. List three toys that Ming and his friends made..." (redundant!)

   ANOTHER EXAMPLE - Question 5 with parts a, b:
   Original: "5. Look at the graph above and answer the following:
              (a) What is the highest value?
              (b) What is the lowest value?"

   CORRECT extraction:
   - Question 5a: questionText = "What is the highest value?" | sectionInstructions = "Look at the graph above and answer the following:"
   - Question 5b: questionText = "What is the lowest value?" | sectionInstructions = ""

Also extract metadata about the exam:
- Subject (Math, English, Chinese, Science, etc.)
- Grade level (Primary 1-6)
- School name if visible on the paper
- Total marks if shown

Important notes:
- Be thorough - extract ALL questions from the document
- Preserve the exact question numbering used in the exam
- Always set the pageNumber field - this is required for linking images to questions
- For fill-in-the-blank questions, include the blanks in the question text using underscores (e.g., "The capital of France is _____")
- If you can't determine something, use null`;

  const { output } = await generateText({
    model: groq("moonshotai/kimi-k2-instruct-0905"),
    temperature: 0.1,
    maxRetries: 3,
    system: systemPrompt,
    output: Output.object({ schema: ExamExtractionSchema }),
    prompt: `Extract all questions and metadata from this exam paper:

${fullDocument}`,
  });

  if (!output) {
    throw new Error("Failed to extract exam data from document");
  }

  return output;
}
