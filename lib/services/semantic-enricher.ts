import { generateText, Output } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { env } from "@/lib/config/env";
import type { StructuralResult } from "./structural-parser";

const groq = createGroq({
  apiKey: env.GROQ_API_KEY,
});

// Schema for semantic enrichment - only the fields LLM needs to determine
const QuestionEnrichmentSchema = z.object({
  questionNumber: z.string(),
  questionType: z
    .enum(["mcq", "fill_blank", "short_answer", "long_answer"])
    .describe("The type of question"),
  relatedImageIds: z
    .array(z.string())
    .describe("IDs of images that are diagrams/figures REQUIRED to answer this question"),
  expectedAnswer: z
    .string()
    .nullable()
    .describe("The expected answer if visible, null if not shown"),
});

const EnrichmentResultSchema = z.object({
  subject: z
    .string()
    .nullable()
    .describe("The subject of the exam, null if not determinable"),
  grade: z
    .string()
    .nullable()
    .describe("The grade level, null if not determinable"),
  schoolName: z
    .string()
    .nullable()
    .describe("The school name, null if not visible"),
  questions: z.array(QuestionEnrichmentSchema),
});

type EnrichmentResult = z.infer<typeof EnrichmentResultSchema>;

// Final output type matching the persistence layer expectations
export interface ExtractedExam {
  subject: string | null;
  grade: string | null;
  schoolName: string | null;
  totalMarks: number | null;
  questions: ExtractedQuestion[];
}

export interface ExtractedQuestion {
  questionNumber: string;
  questionText: string;
  questionType: "mcq" | "fill_blank" | "short_answer" | "long_answer";
  pageNumber: number;
  marks: number | null;
  section: string | null;
  options: { label: string; text: string; isCorrect: boolean | null; }[] | null;
  relatedImageIds: string[];
  expectedAnswer: string | null;
}

/**
 * Enrich structurally parsed questions with semantic understanding from LLM.
 * Only asks LLM for: question type, image relevance, metadata confirmation.
 */
export async function enrichWithLlm(
  structural: StructuralResult
): Promise<ExtractedExam> {
  // Build a focused prompt with just the semantic tasks
  const questionsContext = structural.questions
    .map((q, i) => {
      const hasOptions = q.options && q.options.length > 0;
      const nearbyImages =
        q.nearbyImageIds.length > 0
          ? `Images near this question: ${q.nearbyImageIds.join(", ")}`
          : "No images near this question";

      return `
Question ${i + 1}:
- Number: ${q.questionNumber}
- Text: ${q.questionText.slice(0, 500)}${q.questionText.length > 500 ? "..." : ""}
- Has MCQ options: ${hasOptions ? "Yes (" + q.options!.map((o) => o.label).join(", ") + ")" : "No"}
- ${nearbyImages}
`;
    })
    .join("\n");

  const systemPrompt = `Analyze Singapore Primary school exam questions. Structural data is already extracted - provide only semantic understanding.

For each question:

1. questionType: Classify based on question text and options.

2. relatedImageIds: Select ONLY images needed to answer the question (diagrams, figures, charts, graphs).

   EXCLUDE:
   - Marks tally boxes, score boxes, grading boxes
   - Logos, watermarks, school emblems
   - Answer lines, ruled spaces, blank writing boxes
   - Headers, footers, page numbers, decorative elements

   When unsure, EXCLUDE the image.`;

  const { output } = await generateText({
    model: groq("moonshotai/kimi-k2-instruct-0905"),
    temperature: 0.1,
    maxRetries: 3,
    system: systemPrompt,
    output: Output.object({ schema: EnrichmentResultSchema }),
    prompt: `Analyze this exam paper and classify the questions:

EXAM CONTEXT (first page header):
${structural.fullDocument.slice(0, 1500)}

QUESTIONS TO CLASSIFY:
${questionsContext}`,
  });

  if (!output) {
    throw new Error("Failed to get semantic enrichment from LLM");
  }

  // Merge structural data with LLM enrichment
  return mergeResults(structural, output);
}

function mergeResults(
  structural: StructuralResult,
  enrichment: EnrichmentResult
): ExtractedExam {
  // Create a map of enrichments by question number for fast lookup
  const enrichmentMap = new Map(
    enrichment.questions.map((q) => [q.questionNumber, q])
  );

  const questions: ExtractedQuestion[] = structural.questions.map((sq) => {
    const eq = enrichmentMap.get(sq.questionNumber);

    // Determine question type
    let questionType: ExtractedQuestion["questionType"] = "short_answer";
    if (eq) {
      questionType = eq.questionType;
    } else if (sq.options && sq.options.length >= 2) {
      // Fallback: if we have MCQ options, it's MCQ
      questionType = "mcq";
    }

    // Get related images from LLM, or empty array if not determined
    const relatedImageIds = eq?.relatedImageIds || [];

    // Convert options to include isCorrect field
    const options = sq.options
      ? sq.options.map((o) => ({
        label: o.label,
        text: o.text,
        isCorrect: null as boolean | null, // We don't know the correct answer
      }))
      : null;

    return {
      questionNumber: sq.questionNumber,
      questionText: sq.questionText,
      questionType,
      pageNumber: sq.pageNumber,
      marks: sq.marks,
      section: sq.section,
      options,
      relatedImageIds,
      expectedAnswer: eq?.expectedAnswer || null,
    };
  });

  return {
    // Prefer LLM values for metadata, fallback to structural parser
    subject: enrichment.subject || structural.metadata.possibleSubject,
    grade: enrichment.grade || structural.metadata.possibleGrade,
    schoolName: enrichment.schoolName || structural.metadata.possibleSchool,
    totalMarks: structural.metadata.totalMarks,
    questions,
  };
}
