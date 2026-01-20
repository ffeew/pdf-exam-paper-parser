"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useCallback, useState, useMemo, useRef } from "react";
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
	const [selectedModel, setSelectedModel] = useState<AIModel>("kimi-k2");
	const [input, setInput] = useState("");
	const hasLoadedInitialMessages = useRef(false);

	// Use a unique chat ID per question to separate conversations
	const chatId = `${examId}-${questionNumber}`;

	// Fetch persisted chat history
	const { data: historyData, isLoading: isLoadingHistory } = useChatHistory({
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
	});

	// Load persisted messages when history data arrives
	useEffect(() => {
		if (
			historyData?.messages &&
			historyData.messages.length > 0 &&
			!hasLoadedInitialMessages.current
		) {
			// Convert persisted messages to AI SDK format
			const initialMessages: UIMessage[] = historyData.messages.map((msg) => ({
				id: msg.id,
				role: msg.role,
				content: msg.content,
				createdAt: new Date(msg.createdAt),
				parts: [{ type: "text" as const, text: msg.content }],
			}));
			setMessages(initialMessages);
			hasLoadedInitialMessages.current = true;
		}
	}, [historyData, setMessages]);

	// Reset the loaded flag when question changes
	useEffect(() => {
		hasLoadedInitialMessages.current = false;
		setMessages([]);
		const t = setTimeout(() => setInput(""), 0);
		return () => clearTimeout(t);
	}, [questionNumber, setMessages]);

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
		hasLoadedInitialMessages.current = false;

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
