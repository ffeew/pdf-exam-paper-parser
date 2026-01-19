import { z } from "zod";

// Query parameters schema
export const ListExamsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type ListExamsQuery = z.infer<typeof ListExamsQuerySchema>;

// Individual exam in list (without full questions data)
export const ExamListItemSchema = z.object({
  id: z.string(),
  filename: z.string(),
  subject: z.string().nullable(),
  grade: z.string().nullable(),
  schoolName: z.string().nullable(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  questionCount: z.number(),
  createdAt: z.string(),
});

export type ExamListItem = z.infer<typeof ExamListItemSchema>;

// List response schema
export const ListExamsResponseSchema = z.object({
  exams: z.array(ExamListItemSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type ListExamsResponse = z.infer<typeof ListExamsResponseSchema>;
