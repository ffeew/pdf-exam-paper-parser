import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { GetChatHistoryQuerySchema, ClearChatRequestSchema } from "./validator";
import { getChatHistory, clearChatHistory } from "./service";
import { AuthorizationError } from "@/lib/services/authorization";

export async function handleGetChatHistory(request: NextRequest) {
	try {
		const authResult = await requireAuth();
		if ("error" in authResult) return authResult.error;
		const { user } = authResult;

		// Parse query params
		const url = new URL(request.url);
		const examId = url.searchParams.get("examId");
		const questionNumber = url.searchParams.get("questionNumber");

		const parseResult = GetChatHistoryQuerySchema.safeParse({
			examId,
			questionNumber,
		});

		if (!parseResult.success) {
			return NextResponse.json(
				{
					error: "Invalid query parameters",
					details: parseResult.error.flatten(),
				},
				{ status: 400 }
			);
		}

		const messages = await getChatHistory(
			parseResult.data.examId,
			parseResult.data.questionNumber,
			user.id
		);

		return NextResponse.json({ messages });
	} catch (error) {
		if (error instanceof AuthorizationError) {
			return NextResponse.json({ error: error.message }, { status: 403 });
		}
		console.error("Error fetching chat history:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function handleClearChat(request: NextRequest) {
	try {
		const authResult = await requireAuth();
		if ("error" in authResult) return authResult.error;
		const { user } = authResult;

		// Parse request body
		const body = await request.json();
		const parseResult = ClearChatRequestSchema.safeParse(body);

		if (!parseResult.success) {
			return NextResponse.json(
				{
					error: "Invalid request",
					details: parseResult.error.flatten(),
				},
				{ status: 400 }
			);
		}

		const deletedCount = await clearChatHistory(
			parseResult.data.examId,
			parseResult.data.questionNumber,
			user.id
		);

		return NextResponse.json({ success: true, deletedCount });
	} catch (error) {
		if (error instanceof AuthorizationError) {
			return NextResponse.json({ error: error.message }, { status: 403 });
		}
		console.error("Error clearing chat:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
