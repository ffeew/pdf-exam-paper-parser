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

const SectionSchema = z.object({
  sectionName: z
    .string()
    .describe("The section title/name (e.g., '一、辨字测验', 'Section A', 'Part 1')"),
  instructions: z
    .string()
    .nullable()
    .describe("Section instructions, word banks, reading passages, or shared context for all questions in this section"),
  questionNumbers: z
    .array(z.string())
    .describe("List of question numbers belonging to this section (e.g., ['1', '2', '3'] or ['5a', '5b', '5c'])"),
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
  context: z
    .string()
    .nullable()
    .describe("Contextual passage, sentence, or reference text needed to answer THIS specific question. Different from instructions (how to answer) and section instructions (shared content for multiple questions). Examples: vocabulary-in-context sentences with highlighted words, grammar examples with errors to identify."),
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
  sections: z.array(SectionSchema).describe("All sections in the exam, in order. Questions without a clear section should be grouped into a section with an empty sectionName."),
  questions: z.array(QuestionSchema).describe("All questions in the exam"),
});

export type ExtractedExam = z.infer<typeof ExamExtractionSchema>;
export type ExtractedQuestion = z.infer<typeof QuestionSchema>;
export type ExtractedSection = z.infer<typeof SectionSchema>;

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

  const systemPrompt = `You are extracting questions from Singapore Primary school exam papers. The document is organized by pages with "--- Page N ---" headers.

CRITICAL RULES:

1. MCQ QUESTION TEXT - Remove inline options and replace with blank:
   - Chinese: "不 (1馆 2管 3官 4观) 怎么说" → questionText: "不______怎么说"
   - English: Do NOT include "A, B, C, D" options in questionText (extract to options array)

2. SECTIONS - Extract sections SEPARATELY from questions:
   - Output sections as a separate array with sectionName, instructions, and questionNumbers
   - Section formats: Chinese "一、辨字测验", English "Section A", "Part 1"
   - instructions: MUST include ALL shared context students need: word banks, reading passages, reference tables, cloze text
   - For comprehension: Include the COMPLETE passage word-for-word (not summarized)
   - questionNumbers: List ALL question numbers that belong to this section (e.g., ["1", "2", "3"] or ["5a", "5b", "5c"])
   - Questions without a clear section should be grouped into a section with sectionName="" (empty string)

3. SUB-QUESTIONS - Extract as separate questions, all belonging to same section:
   Original: "21. List three toys Ming made. [3m] (i)___ (ii)___ (iii)___"

   CORRECT:
   - Section: sectionName="List three toys Ming made." | questionNumbers=["21i", "21ii", "21iii"]
   - 21i: questionText="List the first toy."
   - 21ii: questionText="List the second toy."
   - 21iii: questionText="List the third toy."

   Another example - "5. Look at the graph: (a) Highest value? (b) Lowest value?"
   - Section: sectionName="Look at the graph above..." | questionNumbers=["5a", "5b"]
   - 5a: questionText="What is the highest value?"
   - 5b: questionText="What is the lowest value?"

4. IMAGES - Link only content images (diagrams, figures, charts):
   - Image refs in markdown: ![img-0.jpeg](img-0.jpeg)
   - EXCLUDE: logos, watermarks, headers, footers, decorative elements

5. QUESTION-SPECIFIC CONTEXT - Extract contextual content needed to answer individual questions:
   - Use "context" field for sentences/passages that apply to ONE question only
   - Use section "instructions" for content shared across MULTIPLE questions

   EXAMPLES OF CONTEXT:
   - Vocabulary-in-context: "He was **delighted** that he was moving fast and was **confident** that he would be the winner."
     (With labels: "(A) delighted | (B) confident")
   - Grammar correction: "She goed to the store yesterday."
   - Reference sentences: The specific sentence a question asks about

   FORMATTING CONTEXT:
   - Use **bold** for underlined or emphasized words
   - Include option labels if they appear in the passage
   - Preserve the exact text from the document

6. READING COMPREHENSION PASSAGES - Link passage images to FIRST question in section:
   - For comprehension sections (阅读理解, comprehension, reading passage), the passage may be an IMAGE
   - Look for images containing: text passages, notices, flyers, letters, articles, stories
   - Link these passage images to the FIRST question in that section via relatedImageIds
   - This ensures the passage displays with the questions that reference it

   EXAMPLE:
   - Section "四、阅读理解一" has an image of a notice (e.g., 植物园欢乐游)
   - Questions 9, 10, 11 ask about this notice
   - Link the notice image to Question 9's relatedImageIds: ["img-X.jpeg"]
   - Questions 10, 11 will see the image displayed above Question 9

   IMPORTANT: If a reading passage appears as an image near the section header, it belongs to ALL questions in that section - link it to the FIRST question only`;

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
