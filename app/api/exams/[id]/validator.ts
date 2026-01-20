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

export const SectionSchema = z.object({
  id: z.string(),
  sectionName: z.string(),
  instructions: z.string().nullable(),
  orderIndex: z.number(),
});

export const QuestionSchema = z.object({
  id: z.string(),
  questionNumber: z.string(),
  questionText: z.string(),
  questionType: z.enum(["mcq", "fill_blank", "short_answer", "long_answer"]),
  marks: z.number().nullable(),
  sectionId: z.string().nullable(),
  context: z.string().nullable(),
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
  sections: z.array(SectionSchema),
  questions: z.array(QuestionSchema),
  examImages: z.array(QuestionImageSchema),
  documentMarkdown: z.string().nullable(),
});

export type ExamWithQuestions = z.infer<typeof ExamWithQuestionsSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Section = z.infer<typeof SectionSchema>;

// Status response for polling
export const ExamStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  progress: z.number(),
  errorMessage: z.string().nullable(),
});

export type ExamStatus = z.infer<typeof ExamStatusSchema>;
