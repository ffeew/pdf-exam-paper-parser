import { z } from "zod";

export const AnswerOptionSchema = z.object({
  id: z.string(),
  optionLabel: z.string(),
  optionText: z.string(),
  orderIndex: z.number(),
  isCorrect: z.boolean().nullable(),
});

export const QuestionImageSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  altText: z.string().nullable(),
});

export const QuestionSchema = z.object({
  id: z.string(),
  questionNumber: z.string(),
  questionText: z.string(),
  questionType: z.enum(["mcq", "fill_blank", "short_answer", "long_answer"]),
  marks: z.number().nullable(),
  section: z.string().nullable(),
  instructions: z.string().nullable(),
  expectedAnswer: z.string().nullable(),
  orderIndex: z.number(),
  options: z.array(AnswerOptionSchema),
  images: z.array(QuestionImageSchema),
});

export const ExamWithQuestionsSchema = z.object({
  id: z.string(),
  filename: z.string(),
  subject: z.string().nullable(),
  grade: z.string().nullable(),
  schoolName: z.string().nullable(),
  totalMarks: z.number().nullable(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  errorMessage: z.string().nullable(),
  hasAnswerKey: z.boolean().nullable(),
  answerKeyConfidence: z.enum(["high", "medium", "low"]).nullable(),
  createdAt: z.string(),
  questions: z.array(QuestionSchema),
  examImages: z.array(QuestionImageSchema),
});

export type ExamWithQuestions = z.infer<typeof ExamWithQuestionsSchema>;
export type Question = z.infer<typeof QuestionSchema>;

// Status response for polling
export const ExamStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  errorMessage: z.string().nullable(),
});

export type ExamStatus = z.infer<typeof ExamStatusSchema>;
