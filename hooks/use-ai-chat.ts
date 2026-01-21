"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useCallback, useState, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AIModel, QuestionContext } from "@/app/api/ai/ask/validator";
import { useChatHistory, useClearChat } from "./use-chat-history";

// Re-export UIMessage type for components
export type ChatMessage = UIMessage;

interface UseAIChatOptions {
	examId: string;
	questionNumber: string;
	questionContext: QuestionContext;
}

export function useAIChat({
	examId,
	questionNumber,
	questionContext,
}: UseAIChatOptions) {
	const queryClient = useQueryClient();
	const [selectedModel, setSelectedModel] = useState<AIModel>("kimi-k2");
	const [input, setInput] = useState("");
	// Track which question we've loaded messages for
	const loadedForQuestion = useRef<string | null>(null);
	// Track the expected question to prevent loading stale data
	const expectedQuestion = useRef<string>(questionNumber);

	// Use a unique chat ID per question to separate conversations
	const chatId = `${examId}-${questionNumber}`;

	// Fetch persisted chat history
	const { data: historyData, isLoading: isLoadingHistory, dataUpdatedAt } = useChatHistory({
		examId,
		questionNumber,
	});

	// Clear chat mutation
	const clearChatMutation = useClearChat();

	// Create transport with custom endpoint and body data
	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: "/api/ai/ask",
				body: {
					examId,
					questionNumber,
					model: selectedModel,
					questionContext,
				},
			}),
		[examId, questionNumber, selectedModel, questionContext]
	);

	const { messages, status, sendMessage, setMessages, stop } = useChat({
		id: chatId,
		transport,
		onFinish: () => {
			// Invalidate cache to sync persisted messages with DB
			queryClient.invalidateQueries({
				queryKey: ["chat-history", examId, questionNumber],
			});
		},
	});

	// Clear messages and update expected question when question changes
	useEffect(() => {
		// Update expected question immediately
		expectedQuestion.current = questionNumber;

		// Only clear if we're switching to a different question
		if (loadedForQuestion.current !== null && loadedForQuestion.current !== questionNumber) {
			setMessages([]);
		}
		loadedForQuestion.current = null;
	}, [questionNumber, setMessages]);

	// Load persisted messages when history data arrives for current question
	useEffect(() => {
		// Prevent race condition: only load if data is for the currently expected question
		// This handles the case where question changes rapidly and stale data arrives late
		if (expectedQuestion.current !== questionNumber) {
			return;
		}

		// Only load if we haven't loaded for this question yet
		if (loadedForQuestion.current === questionNumber) {
			return;
		}

		// Wait for loading to complete
		if (isLoadingHistory) {
			return;
		}

		// Mark as loaded for this question (even if no messages)
		loadedForQuestion.current = questionNumber;

		if (historyData?.messages && historyData.messages.length > 0) {
			// Convert persisted messages to AI SDK format
			const initialMessages = historyData.messages.map((msg) => ({
				id: msg.id,
				role: msg.role as "user" | "assistant",
				content: msg.content,
				createdAt: new Date(msg.createdAt),
				parts: [{ type: "text" as const, text: msg.content }],
			})) satisfies UIMessage[];
			setMessages(initialMessages);
		}
	}, [historyData, isLoadingHistory, questionNumber, setMessages, dataUpdatedAt]);

	// Determine loading state from status
	const isLoading = status === "submitted" || status === "streaming";

	// Wrap sendMessage to match the expected interface
	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			const trimmedInput = input.trim();
			if (!trimmedInput || isLoading) return;

			setInput("");
			await sendMessage({ text: trimmedInput });
		},
		[input, isLoading, sendMessage]
	);

	const clearMessages = useCallback(async () => {
		stop();
		setMessages([]);
		setInput("");
		// Reset so we can re-load if user clears and new messages come in
		loadedForQuestion.current = null;

		try {
			await clearChatMutation.mutateAsync({ examId, questionNumber });
		} catch (error) {
			console.error("Failed to clear chat history:", error);
			// Messages are already cleared locally, so we don't need to restore
		}
	}, [stop, setMessages, clearChatMutation, examId, questionNumber]);

	// Error handling
	const error = status === "error" ? new Error("An error occurred") : null;

	return {
		messages,
		input,
		setInput,
		handleSubmit,
		isLoading,
		isLoadingHistory,
		error,
		selectedModel,
		setSelectedModel,
		clearMessages,
		isClearingChat: clearChatMutation.isPending,
	};
}
