import { db } from "@/lib/db";
import { chatMessages, questions } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { verifyExamOwnership } from "@/lib/services/authorization";
import type { ChatHistoryMessage } from "./validator";

export async function getChatHistory(
	examId: string,
	questionNumber: string,
	userId: string
): Promise<ChatHistoryMessage[]> {
	// Verify user owns this exam before proceeding
	await verifyExamOwnership(examId, userId);

	// First, find the question ID by examId + questionNumber
	const question = await db.query.questions.findFirst({
		where: and(
			eq(questions.examId, examId),
			eq(questions.questionNumber, questionNumber)
		),
		columns: { id: true },
	});

	if (!question) {
		return [];
	}

	// Fetch messages for this question, ordered by creation time
	const messages = await db.query.chatMessages.findMany({
		where: and(
			eq(chatMessages.examId, examId),
			eq(chatMessages.questionId, question.id),
			eq(chatMessages.userId, userId)
		),
		orderBy: [asc(chatMessages.createdAt)],
		columns: {
			id: true,
			role: true,
			content: true,
			createdAt: true,
		},
	});

	return messages.map((msg) => ({
		id: msg.id,
		role: msg.role,
		content: msg.content,
		createdAt: msg.createdAt.toISOString(),
	}));
}

export async function clearChatHistory(
	examId: string,
	questionNumber: string,
	userId: string
): Promise<number> {
	// Verify user owns this exam before proceeding
	await verifyExamOwnership(examId, userId);

	// Find the question ID
	const question = await db.query.questions.findFirst({
		where: and(
			eq(questions.examId, examId),
			eq(questions.questionNumber, questionNumber)
		),
		columns: { id: true },
	});

	if (!question) {
		return 0;
	}

	// Delete all messages for this user/exam/question combination
	const result = await db
		.delete(chatMessages)
		.where(
			and(
				eq(chatMessages.examId, examId),
				eq(chatMessages.questionId, question.id),
				eq(chatMessages.userId, userId)
			)
		)
		.returning({ id: chatMessages.id });

	return result.length;
}
