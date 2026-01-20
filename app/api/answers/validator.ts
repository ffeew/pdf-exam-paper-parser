import { z } from "zod";

// Submit/update answer request
export const SubmitAnswerRequestSchema = z.object({
  examId: z.string().min(1, "Exam ID is required"),
  questionId: z.string().min(1, "Question ID is required"),
  answerText: z.string().nullable(),
  selectedOptionId: z.string().nullable(),
  version: z.number().optional(), // Client-side version for race condition handling
});

export type SubmitAnswerRequest = z.infer<typeof SubmitAnswerRequestSchema>;

// Single answer response
export const UserAnswerSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  answerText: z.string().nullable(),
  selectedOptionId: z.string().nullable(),
  isCorrect: z.boolean().nullable(),
  score: z.number().nullable(),
  maxScore: z.number().nullable(),
  feedback: z.string().nullable(),
  gradingStatus: z
    .enum(["pending", "grading", "graded", "error"])
    .nullable(),
  gradingModel: z.string().nullable(),
  gradedAt: z.string().nullable(),
  submittedAt: z.string(),
  updatedAt: z.string(),
});

export type UserAnswer = z.infer<typeof UserAnswerSchema>;

// Get answers request (query params)
export const GetAnswersQuerySchema = z.object({
  examId: z.string().min(1, "Exam ID is required"),
});

export type GetAnswersQuery = z.infer<typeof GetAnswersQuerySchema>;

// Get answers response
export const GetAnswersResponseSchema = z.object({
  answers: z.array(UserAnswerSchema),
});

export type GetAnswersResponse = z.infer<typeof GetAnswersResponseSchema>;
