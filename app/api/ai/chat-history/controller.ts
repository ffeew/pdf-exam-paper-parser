import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { GetChatHistoryQuerySchema, ClearChatRequestSchema } from "./validator";
import { getChatHistory, clearChatHistory } from "./service";

export async function handleGetChatHistory(request: NextRequest) {
	try {
		// Auth check
		const session = await auth.api.getSession({ headers: await headers() });
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

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
			session.user.id
		);

		return NextResponse.json({ messages });
	} catch (error) {
		console.error("Error fetching chat history:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function handleClearChat(request: NextRequest) {
	try {
		// Auth check
		const session = await auth.api.getSession({ headers: await headers() });
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

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
			session.user.id
		);

		return NextResponse.json({ success: true, deletedCount });
	} catch (error) {
		console.error("Error clearing chat:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
