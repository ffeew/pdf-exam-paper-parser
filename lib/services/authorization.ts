import { db } from "@/lib/db";
import { exams } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export class AuthorizationError extends Error {
	constructor(message: string = "Not authorized to access this resource") {
		super(message);
		this.name = "AuthorizationError";
	}
}

/**
 * Verifies that a user owns a specific exam.
 * Throws AuthorizationError if the user doesn't own the exam or exam doesn't exist.
 */
export async function verifyExamOwnership(
	examId: string,
	userId: string
): Promise<void> {
	const exam = await db.query.exams.findFirst({
		where: and(eq(exams.id, examId), eq(exams.userId, userId)),
		columns: { id: true },
	});

	if (!exam) {
		throw new AuthorizationError("Exam not found or access denied");
	}
}

/**
 * Checks if a user owns an exam without throwing.
 * Returns true if the user owns the exam, false otherwise.
 */
export async function checkExamOwnership(
	examId: string,
	userId: string
): Promise<boolean> {
	const exam = await db.query.exams.findFirst({
		where: and(eq(exams.id, examId), eq(exams.userId, userId)),
		columns: { id: true },
	});

	return !!exam;
}
