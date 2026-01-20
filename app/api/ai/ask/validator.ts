import { z } from "zod";

// Supported AI models
export const AIModelSchema = z.enum(["gpt-oss-120b", "kimi-k2"]);
export type AIModel = z.infer<typeof AIModelSchema>;

// Chat message for conversation history
export const ChatMessageSchema = z.object({
	role: z.enum(["user", "assistant"]),
	content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// MCQ option context
export const OptionContextSchema = z.object({
	optionLabel: z.string(),
	optionText: z.string(),
});

// Question context passed to AI
export const QuestionContextSchema = z.object({
	questionNumber: z.string(),
	questionText: z.string(),
	questionType: z.enum(["mcq", "fill_blank", "short_answer", "long_answer"]),
	marks: z.number().nullable(),
	options: z.array(OptionContextSchema).nullable(),
	context: z.string().nullable(),
});
export type QuestionContext = z.infer<typeof QuestionContextSchema>;

// Request schema
export const AskRequestSchema = z.object({
	examId: z.string().min(1),
	questionNumber: z.string().min(1),
	userMessage: z.string().min(1).max(2000),
	conversationHistory: z.array(ChatMessageSchema).max(20).default([]),
	model: AIModelSchema.default("kimi-k2"),
	questionContext: QuestionContextSchema,
});
export type AskRequest = z.infer<typeof AskRequestSchema>;
