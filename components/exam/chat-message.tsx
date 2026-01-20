"use client";

import { cn } from "@/lib/utils";
import { MarkdownText } from "@/components/ui/markdown-text";
import type { ChatMessage as ChatMessageType } from "@/hooks/use-ai-chat";

interface ChatMessageProps {
	message: ChatMessageType;
}

// Extract text content from message parts
function getMessageText(message: ChatMessageType): string {
	return message.parts
		.filter((part) => part.type === "text")
		.map((part) => (part.type === "text" ? part.text : ""))
		.join("");
}

export function ChatMessage({ message }: ChatMessageProps) {
	const isUser = message.role === "user";
	const text = getMessageText(message);

	return (
		<div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
			<div
				className={cn(
					"max-w-[85%] rounded-lg px-3 py-2 text-sm",
					isUser ? "bg-primary text-primary-foreground" : "bg-muted"
				)}
			>
				{isUser ? (
					<p className="whitespace-pre-wrap">{text}</p>
				) : (
					<MarkdownText text={text} />
				)}
			</div>
		</div>
	);
}
