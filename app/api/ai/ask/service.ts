import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { env } from "@/lib/config/env";
import { db } from "@/lib/db";
import { chatMessages, questions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyExamOwnership } from "@/lib/services/authorization";
import type { AIModel, QuestionContext } from "./validator";

const groq = createGroq({
	apiKey: env.GROQ_API_KEY,
});

// Map UI model names to Groq model IDs
const MODEL_MAP: Record<AIModel, string> = {
	"gpt-oss-120b": "openai/gpt-oss-120b",
	"kimi-k2": "moonshotai/kimi-k2-instruct-0905",
};

const TUTOR_SYSTEM_PROMPT = `You are a helpful and patient tutor assisting a student with their exam practice. Your role is to:

1. NEVER give away the direct answer - instead, guide the student to discover it themselves
2. Provide hints, explanations of concepts, and ask guiding questions
3. Break down complex problems into smaller, manageable steps
4. Explain relevant formulas, rules, or concepts when needed
5. Encourage the student and build their confidence
6. If the student is completely stuck, provide increasingly specific hints
7. For MCQ questions, help eliminate wrong options through reasoning, don't just reveal the answer
8. Respond in a friendly, supportive tone appropriate for students
9. Keep responses concise and focused - students don't need long essays

Remember: Your goal is to help the student LEARN, not just get the right answer.`;

function buildContextPrompt(context: QuestionContext): string {
	let prompt = `\n\nCurrent Question Context:`;

	if (context.sectionName) {
		prompt += `\n- Section: ${context.sectionName}`;
	}
	if (context.sectionInstructions) {
		prompt += `\n- Section Instructions: ${context.sectionInstructions}`;
	}

	prompt += `\n- Question Number: ${context.questionNumber}
- Type: ${context.questionType}
- Marks: ${context.marks ?? "Not specified"}
- Question: ${context.questionText}`;

	if (context.options && context.options.length > 0) {
		prompt += `\n- Options:\n${context.options.map((o) => `  ${o.optionLabel}. ${o.optionText}`).join("\n")}`;
	}

	if (context.context) {
		prompt += `\n- Additional Context: ${context.context}`;
	}

	return prompt;
}

export async function streamAIResponse(
	examId: string,
	questionNumber: string,
	messages: UIMessage[],
	model: AIModel,
	questionContext: QuestionContext,
	userId: string
) {
	// Verify user owns this exam before proceeding
	await verifyExamOwnership(examId, userId);

	// Find the question ID for persistence
	const question = await db.query.questions.findFirst({
		where: and(
			eq(questions.examId, examId),
			eq(questions.questionNumber, questionNumber)
		),
		columns: { id: true },
	});

	const questionId = question?.id ?? null;
	const modelId = MODEL_MAP[model];

	// Extract the last user message for persistence
	const lastUserMessage = messages.findLast((m) => m.role === "user");
	const userMessageContent = extractTextFromMessage(lastUserMessage);

	// Convert UI messages to model messages format
	const modelMessages = await convertToModelMessages(messages);

	// Save user message to database
	await db.insert(chatMessages).values({
		id: crypto.randomUUID(),
		examId,
		questionId,
		userId,
		role: "user",
		content: userMessageContent,
		aiModel: null,
		createdAt: new Date(),
	});

	// Stream the response with onFinish callback for persistence
	const result = streamText({
		model: groq(modelId),
		system: TUTOR_SYSTEM_PROMPT + buildContextPrompt(questionContext),
		messages: modelMessages,
		temperature: 0.7,
		onFinish: async ({ text, usage }) => {
			// Save assistant message after streaming completes
			await saveChatMessage(
				examId,
				questionId,
				userId,
				"assistant",
				text,
				model,
				usage?.totalTokens
			);
		},
	});

	return result;
}

// Helper to extract text content from a UI message
function extractTextFromMessage(message: UIMessage | undefined): string {
	if (!message) return "";
	// UIMessage parts contain the actual content
	const textPart = message.parts.find((part) => part.type === "text");
	return textPart?.type === "text" ? textPart.text : "";
}

export async function saveChatMessage(
	examId: string,
	questionId: string | null,
	userId: string,
	role: "user" | "assistant",
	content: string,
	aiModel: AIModel | null,
	tokensUsed?: number
) {
	await db.insert(chatMessages).values({
		id: crypto.randomUUID(),
		examId,
		questionId,
		userId,
		role,
		content,
		aiModel,
		tokensUsed: tokensUsed ?? null,
		createdAt: new Date(),
	});
}
