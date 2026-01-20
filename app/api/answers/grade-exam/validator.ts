import { z } from "zod";
import { AIModelSchema, GradeResultSchema } from "../grade/validator";

// Grade all exam answers request
export const GradeExamRequestSchema = z.object({
  examId: z.string().min(1, "Exam ID is required"),
  model: AIModelSchema.default("kimi-k2"),
});

export type GradeExamRequest = z.infer<typeof GradeExamRequestSchema>;

// Batch grade response
export const GradeExamResponseSchema = z.object({
  results: z.array(GradeResultSchema),
  summary: z.object({
    total: z.number(),
    graded: z.number(),
    failed: z.number(),
    totalScore: z.number(),
    maxPossibleScore: z.number(),
  }),
});

export type GradeExamResponse = z.infer<typeof GradeExamResponseSchema>;
