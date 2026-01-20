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

// Request schema - uses AI SDK UIMessage format (passthrough for messages)
export const AskRequestSchema = z.object({
	examId: z.string().min(1),
	questionNumber: z.string().min(1),
	messages: z.array(z.any()).min(1).max(21) as z.ZodType<UIMessage[]>,
	model: AIModelSchema.default("kimi-k2"),
	questionContext: QuestionContextSchema,
});
export type AskRequest = z.infer<typeof AskRequestSchema>;
