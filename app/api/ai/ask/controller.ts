import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { AskRequestSchema } from "./validator";
import { streamAIResponse } from "./service";
import { AuthorizationError } from "@/lib/services/authorization";

export async function handleAskStream(request: NextRequest) {
	try {
		const authResult = await requireAuth();
		if ("error" in authResult) {
			// Convert NextResponse to Response for streaming endpoint
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}
		const { user } = authResult;

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

		const { examId, questionNumber, messages, model, questionContext } =
			parseResult.data;

		// Get streaming response (onFinish callback handles persistence)
		const result = await streamAIResponse(
			examId,
			questionNumber,
			messages,
			model,
			questionContext,
			user.id
		);

		// Return streaming response in UI message format
		return result.toUIMessageStreamResponse();
	} catch (error) {
		if (error instanceof AuthorizationError) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 403,
				headers: { "Content-Type": "application/json" },
			});
		}
		console.error("Error in AI ask endpoint:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
