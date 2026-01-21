import { z } from "zod";
import type { UIMessage } from "ai";

// Supported AI models
export const AIModelSchema = z.enum(["gpt-oss-120b", "kimi-k2"]);
export type AIModel = z.infer<typeof AIModelSchema>;

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
	sectionName: z.string().nullable(),
	sectionInstructions: z.string().nullable(),
	sectionContext: z.string().nullable(),
});
export type QuestionContext = z.infer<typeof QuestionContextSchema>;

// UIMessage schema - validates structure of AI SDK messages
// Accept parts as passthrough to handle any AI SDK part types
const UIMessageSchema = z.object({
	id: z.string().min(1),
	role: z.enum(["user", "assistant", "system"]),
	content: z.string().optional().default(""),
	parts: z.array(z.unknown()).optional(),
	createdAt: z.coerce.date().optional(),
});

// Normalize messages to ensure all have text parts (required by convertToModelMessages)
function normalizeMessages(msgs: z.infer<typeof UIMessageSchema>[]): UIMessage[] {
	return msgs.map((msg) => {
		// Check if parts has any text content
		const existingParts = msg.parts as Array<{ type?: string; text?: string }> | undefined;
		const hasTextPart = existingParts?.some(
			(p) => p.type === "text" && typeof p.text === "string" && p.text.length > 0
		);

		// If parts exists with text content, use it; otherwise create from content
		const parts = hasTextPart
			? (existingParts as UIMessage["parts"])
			: [{ type: "text" as const, text: msg.content || "" }];

		return {
			id: msg.id,
			role: msg.role,
			createdAt: msg.createdAt,
			parts,
		};
	});
}

// Request schema - uses AI SDK UIMessage format with proper validation
export const AskRequestSchema = z.object({
	examId: z.string().min(1),
	questionNumber: z.string().min(1),
	messages: z
		.array(UIMessageSchema)
		.min(1)
		.max(21)
		.transform(normalizeMessages),
	model: AIModelSchema.default("kimi-k2"),
	questionContext: QuestionContextSchema,
});
export type AskRequest = z.infer<typeof AskRequestSchema>;
