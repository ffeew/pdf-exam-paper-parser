"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector } from "./model-selector";
import { ChatMessage } from "./chat-message";
import { useAIChat } from "@/hooks/use-ai-chat";
import { Send, Loader2, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Question } from "@/app/api/exams/[id]/validator";

interface AIChatPanelProps {
	examId: string;
	question: Question;
	questions: Question[];
	onQuestionChange: (questionNumber: string) => void;
	onClose?: () => void;
}

export function AIChatPanel({ examId, question, questions, onQuestionChange, onClose }: AIChatPanelProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const questionContext = {
		questionNumber: question.questionNumber,
		questionText: question.questionText,
		questionType: question.questionType,
		marks: question.marks,
		options:
			question.options?.map((o) => ({
				optionLabel: o.optionLabel,
				optionText: o.optionText,
			})) ?? null,
		context: question.context,
	};

	const {
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
		isClearingChat,
	} = useAIChat({
		examId,
		questionNumber: question.questionNumber,
		questionContext,
	});

	// Auto-scroll to bottom when new messages arrive (only if there are messages)
	useEffect(() => {
		if (messages.length > 0 && scrollContainerRef.current) {
			scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
		}
	}, [messages]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (input.trim() && !isLoading) {
				const form = e.currentTarget.form;
				if (form) {
					form.requestSubmit();
				}
			}
		}
	};

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Header with model selector */}
			<div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
				<span className="text-sm font-medium">Ask AI - Q{question.questionNumber}</span>
				<div className="flex items-center gap-2">
					{messages.length > 0 && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={clearMessages}
							disabled={isClearingChat || isLoading}
							title="Clear chat history"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					)}
					<ModelSelector
						value={selectedModel}
						onChange={setSelectedModel}
						disabled={isLoading}
					/>
					{onClose && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={onClose}
						>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>

			{/* Question pills */}
			<div className="flex gap-1 px-3 py-2 border-b shrink-0 overflow-x-auto">
				{questions.map((q) => (
					<button
						key={q.id}
						onClick={() => onQuestionChange(q.questionNumber)}
						className={cn(
							"px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors",
							q.questionNumber === question.questionNumber
								? "bg-primary text-primary-foreground"
								: "bg-muted hover:bg-muted/80 text-muted-foreground"
						)}
					>
						Q{q.questionNumber}
					</button>
				))}
			</div>

			{/* Messages area */}
			<div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4">
				{isLoadingHistory ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				) : messages.length === 0 ? (
					<div className="text-center text-muted-foreground text-sm py-8">
						<p>Ask me anything about this question!</p>
						<p className="mt-1 text-xs">
							I will help guide you to the answer.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{messages.map((msg) => (
							<ChatMessage key={msg.id} message={msg} />
						))}
						{isLoading && messages[messages.length - 1]?.role === "user" && (
							<div className="flex items-center gap-2 text-muted-foreground text-sm">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span>Thinking...</span>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Error display */}
			{error && (
				<div className="px-4 py-2 text-sm text-destructive bg-destructive/10 shrink-0">
					{error.message}
				</div>
			)}

			{/* Input area */}
			<form onSubmit={handleSubmit} className="p-3 border-t shrink-0">
				<div className="flex gap-2">
					<Textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Ask about this question..."
						disabled={isLoading}
						rows={1}
						className="resize-none min-h-[40px] max-h-[120px]"
					/>
					<Button
						type="submit"
						size="icon"
						disabled={!input.trim() || isLoading}
					>
						{isLoading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Send className="h-4 w-4" />
						)}
					</Button>
				</div>
			</form>
		</div>
	);
}
