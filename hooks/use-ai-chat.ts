"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { AIModel, QuestionContext } from "@/app/api/ai/ask/validator";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
}

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
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [selectedModel, setSelectedModel] = useState<AIModel>("kimi-k2");
	const abortControllerRef = useRef<AbortController | null>(null);

	// Reset messages when question changes
	useEffect(() => {
		setMessages([]);
		setError(null);
	}, [questionNumber]);

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (!input.trim() || isLoading) return;

			const userMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "user",
				content: input.trim(),
			};

			const assistantMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: "",
			};

			setMessages((prev) => [...prev, userMessage, assistantMessage]);
			setInput("");
			setIsLoading(true);
			setError(null);

			try {
				abortControllerRef.current = new AbortController();

				// Build conversation history (exclude the new messages)
				const conversationHistory = messages.map((m) => ({
					role: m.role,
					content: m.content,
				}));

				const response = await fetch("/api/ai/ask", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						examId,
						questionNumber,
						userMessage: userMessage.content,
						conversationHistory,
						model: selectedModel,
						questionContext,
					}),
					signal: abortControllerRef.current.signal,
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.error || "Failed to send message");
				}

				// Handle streaming text response
				const reader = response.body?.getReader();
				if (!reader) throw new Error("No response body");

				const decoder = new TextDecoder();
				let fullContent = "";

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value, { stream: true });
					fullContent += chunk;

					// Update the assistant message in place
					setMessages((prev) => {
						const newMessages = [...prev];
						const lastIndex = newMessages.length - 1;
						if (newMessages[lastIndex]?.role === "assistant") {
							newMessages[lastIndex] = {
								...newMessages[lastIndex],
								content: fullContent,
							};
						}
						return newMessages;
					});
				}
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") {
					return;
				}

				const errorInstance =
					err instanceof Error ? err : new Error("An error occurred");
				setError(errorInstance);

				// Remove the empty assistant message on error
				setMessages((prev) => prev.slice(0, -1));
			} finally {
				setIsLoading(false);
				abortControllerRef.current = null;
			}
		},
		[
			input,
			isLoading,
			messages,
			examId,
			questionNumber,
			selectedModel,
			questionContext,
		]
	);

	const clearMessages = useCallback(() => {
		abortControllerRef.current?.abort();
		setMessages([]);
		setError(null);
	}, []);

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
