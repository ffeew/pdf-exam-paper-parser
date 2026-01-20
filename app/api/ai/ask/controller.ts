import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { AskRequestSchema } from "./validator";
import { streamAIResponse } from "./service";

export async function handleAskStream(request: NextRequest) {
	try {
		// Auth check
		const session = await auth.api.getSession({ headers: await headers() });
		if (!session?.user) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Parse and validate request
		const body = await request.json();
		const parseResult = AskRequestSchema.safeParse(body);

		if (!parseResult.success) {
			return new Response(
				JSON.stringify({
					error: "Invalid request",
					details: parseResult.error.flatten(),
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } }
			);
		}

		const {
			examId,
			questionNumber,
			userMessage,
			conversationHistory,
			model,
			questionContext,
		} = parseResult.data;

		// Get streaming response (onFinish callback handles persistence)
		const result = await streamAIResponse(
			examId,
			questionNumber,
			userMessage,
			conversationHistory,
			model,
			questionContext,
			session.user.id
		);

		// Return streaming response
		return result.toTextStreamResponse();
	} catch (error) {
		console.error("Error in AI ask endpoint:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
