import { z } from "zod";

// Query params for GET request
export const GetChatHistoryQuerySchema = z.object({
	examId: z.string().min(1),
	questionNumber: z.string().min(1),
});
export type GetChatHistoryQuery = z.infer<typeof GetChatHistoryQuerySchema>;

// Request body for DELETE request
export const ClearChatRequestSchema = z.object({
	examId: z.string().min(1),
	questionNumber: z.string().min(1),
});
export type ClearChatRequest = z.infer<typeof ClearChatRequestSchema>;

// Response schema for chat messages
export const ChatHistoryMessageSchema = z.object({
	id: z.string(),
	role: z.enum(["user", "assistant"]),
	content: z.string(),
	createdAt: z.string(),
});
export type ChatHistoryMessage = z.infer<typeof ChatHistoryMessageSchema>;

export const GetChatHistoryResponseSchema = z.object({
	messages: z.array(ChatHistoryMessageSchema),
});
export type GetChatHistoryResponse = z.infer<typeof GetChatHistoryResponseSchema>;

export const ClearChatResponseSchema = z.object({
	success: z.boolean(),
	deletedCount: z.number(),
});
export type ClearChatResponse = z.infer<typeof ClearChatResponseSchema>;
