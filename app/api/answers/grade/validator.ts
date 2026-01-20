import { z } from "zod";

// Supported AI models (same as AI ask endpoint)
export const AIModelSchema = z.enum(["gpt-oss-120b", "kimi-k2"]);
export type AIModel = z.infer<typeof AIModelSchema>;

// Grade single answer request
export const GradeAnswerRequestSchema = z.object({
  examId: z.string().min(1, "Exam ID is required"),
  questionId: z.string().min(1, "Question ID is required"),
  model: AIModelSchema.default("kimi-k2"),
});

export type GradeAnswerRequest = z.infer<typeof GradeAnswerRequestSchema>;

// Grade response
export const GradeResultSchema = z.object({
  questionId: z.string(),
  isCorrect: z.boolean(),
  score: z.number(),
  maxScore: z.number(),
  feedback: z.string(),
  gradingModel: z.string(),
  gradedAt: z.string(),
});

export type GradeResult = z.infer<typeof GradeResultSchema>;

// LLM grading output schema (for parsing LLM response)
export const LLMGradeOutputSchema = z.object({
  isCorrect: z.boolean(),
  score: z.number(),
  feedback: z.string(),
});

export type LLMGradeOutput = z.infer<typeof LLMGradeOutputSchema>;
