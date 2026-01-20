import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { env } from "@/lib/config/env";
import { db } from "@/lib/db";
import { chatMessages, questions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { AIModel, QuestionContext, ChatMessage } from "./validator";

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
	let prompt = `\n\nCurrent Question Context:
- Question Number: ${context.questionNumber}
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
	userMessage: string,
	conversationHistory: ChatMessage[],
	model: AIModel,
	questionContext: QuestionContext,
	userId: string
) {
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

	// Build messages array for the AI
	const messages = [
		...conversationHistory.map((msg) => ({
			role: msg.role as "user" | "assistant",
			content: msg.content,
		})),
		{ role: "user" as const, content: userMessage },
	];

	// Save user message to database
	const userMsgId = crypto.randomUUID();
	await db.insert(chatMessages).values({
		id: userMsgId,
		examId,
		questionId,
		userId,
		role: "user",
		content: userMessage,
		aiModel: null,
		createdAt: new Date(),
	});

	// Stream the response with onFinish callback for persistence
	const result = streamText({
		model: groq(modelId),
		system: TUTOR_SYSTEM_PROMPT + buildContextPrompt(questionContext),
		messages,
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
