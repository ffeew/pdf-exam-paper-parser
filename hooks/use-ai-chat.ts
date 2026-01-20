"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useCallback, useState, useMemo } from "react";
import type { AIModel, QuestionContext } from "@/app/api/ai/ask/validator";

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

	// Use a unique chat ID per question to separate conversations
	const chatId = `${examId}-${questionNumber}`;

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

	// Clear messages when question changes
	useEffect(() => {
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

	const clearMessages = useCallback(() => {
		stop();
		setMessages([]);
		setInput("");
	}, [stop, setMessages]);

	// Error handling
	const error = status === "error" ? new Error("An error occurred") : null;

	return {
		messages,
		input,
		setInput,
		handleSubmit,
		isLoading,
		error,
		selectedModel,
		setSelectedModel,
		clearMessages,
	};
}
