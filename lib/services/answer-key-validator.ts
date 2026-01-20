import { z } from "zod";

export const AnswerKeyEntrySchema = z.object({
  questionNumber: z
    .string()
    .describe("The question number (e.g., '1', '2a', '2(i)')"),
  answer: z
    .string()
    .describe("The answer - 'A'/'B'/'C'/'D' for MCQ, or text for others"),
  answerType: z
    .enum(["mcq_option", "text"])
    .describe("Whether this is an MCQ option letter or a text answer"),
});
export type AnswerKeyEntry = z.infer<typeof AnswerKeyEntrySchema>;

export const AnswerKeyDetectionSchema = z.object({
  hasAnswerKey: z
    .boolean()
    .describe("Whether an answer key section was detected in the document"),
  answerKeyPageNumbers: z
    .array(z.number())
    .describe("Page numbers where the answer key appears (1-indexed)"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence level of the detection"),
  reason: z
    .string()
    .describe("Brief explanation of why an answer key was or was not detected"),
});
export type AnswerKeyDetection = z.infer<typeof AnswerKeyDetectionSchema>;

export const AnswerKeyExtractionSchema = z.object({
  entries: z
    .array(AnswerKeyEntrySchema)
    .describe("All answer entries extracted from the answer key"),
});
export type AnswerKeyExtraction = z.infer<typeof AnswerKeyExtractionSchema>;

export const AnswerKeyResultSchema = z.object({
  found: z.boolean(),
  entries: z.array(AnswerKeyEntrySchema),
  confidence: z.enum(["high", "medium", "low"]),
  sourcePageNumbers: z.array(z.number()),
});
export type AnswerKeyResult = z.infer<typeof AnswerKeyResultSchema>;
