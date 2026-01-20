"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
	GetChatHistoryResponse,
	ClearChatResponse,
} from "@/app/api/ai/chat-history/validator";

interface UseChatHistoryOptions {
	examId: string;
	questionNumber: string;
	enabled?: boolean;
}

async function fetchChatHistory(
	examId: string,
	questionNumber: string
): Promise<GetChatHistoryResponse> {
	const params = new URLSearchParams({ examId, questionNumber });
	const response = await fetch(`/api/ai/chat-history?${params}`);

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.error || "Failed to fetch chat history");
	}

	return response.json();
}

async function clearChat(
	examId: string,
	questionNumber: string
): Promise<ClearChatResponse> {
	const response = await fetch("/api/ai/chat-history", {
		method: "DELETE",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ examId, questionNumber }),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.error || "Failed to clear chat");
	}

	return response.json();
}

export function useChatHistory({
	examId,
	questionNumber,
	enabled = true,
}: UseChatHistoryOptions) {
	return useQuery({
		queryKey: ["chat-history", examId, questionNumber],
		queryFn: () => fetchChatHistory(examId, questionNumber),
		enabled,
		staleTime: 0,
	});
}

export function useClearChat() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			examId,
			questionNumber,
		}: {
			examId: string;
			questionNumber: string;
		}) => clearChat(examId, questionNumber),
		onSuccess: (_data, variables) => {
			// Invalidate the chat history query to refetch
			queryClient.invalidateQueries({
				queryKey: ["chat-history", variables.examId, variables.questionNumber],
			});
		},
	});
}
