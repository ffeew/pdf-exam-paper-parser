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
	context: z.string().nullable(),
	sectionName: z.string().nullable(),
	sectionInstructions: z.string().nullable(),
});
export type QuestionContext = z.infer<typeof QuestionContextSchema>;

// UIMessage part schemas - matches AI SDK's message part types
const TextPartSchema = z.object({
	type: z.literal("text"),
	text: z.string(),
});

const ToolInvocationPartSchema = z.object({
	type: z.literal("tool-invocation"),
	toolInvocationId: z.string(),
	toolName: z.string(),
	args: z.unknown(),
	state: z.enum(["partial-call", "call", "result"]),
	result: z.unknown().optional(),
});

const UIMessagePartSchema = z.discriminatedUnion("type", [
	TextPartSchema,
	ToolInvocationPartSchema,
]);

// UIMessage schema - validates structure of AI SDK messages
const UIMessageSchema = z.object({
	id: z.string().min(1),
	role: z.enum(["user", "assistant", "system"]),
	content: z.string(),
	parts: z.array(UIMessagePartSchema),
	createdAt: z.coerce.date().optional(),
});

// Request schema - uses AI SDK UIMessage format with proper validation
export const AskRequestSchema = z.object({
	examId: z.string().min(1),
	questionNumber: z.string().min(1),
	messages: z
		.array(UIMessageSchema)
		.min(1)
		.max(21)
		.transform((msgs) => msgs as UIMessage[]),
	model: AIModelSchema.default("kimi-k2"),
	questionContext: QuestionContextSchema,
});
export type AskRequest = z.infer<typeof AskRequestSchema>;
