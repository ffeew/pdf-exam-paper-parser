"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CompactAnswerInput } from "./compact-answer-input";
import { AIChatPanel } from "./ai-chat-panel";
import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";
import type { Question, Section } from "@/app/api/exams/[id]/validator";

interface AnswerSidePanelProps {
	examId: string;
	questions: Question[];
	sections: Section[];
	activeQuestionNumber: string | null;
	onQuestionClick: (questionNumber: string) => void;
}

export function AnswerSidePanel({
	examId,
	questions,
	sections,
	activeQuestionNumber,
	onQuestionClick,
}: AnswerSidePanelProps) {
	const [activeTab, setActiveTab] = useState<string>("answers");
	const [selectedQuestionForChat, setSelectedQuestionForChat] = useState<string | null>(
		() => questions[0]?.questionNumber ?? null
	);
	const containerRef = useRef<HTMLDivElement>(null);
	const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	// Get the selected question object for chat
	const selectedQuestion = questions.find(
		(q) => q.questionNumber === selectedQuestionForChat
	);

	// Auto-scroll to active question when it changes (answers tab only)
	useEffect(() => {
		if (activeTab === "answers" && activeQuestionNumber && containerRef.current) {
			const card = cardRefs.current.get(activeQuestionNumber);
			if (card) {
				card.scrollIntoView({ behavior: "smooth", block: "nearest" });
			}
		}
	}, [activeQuestionNumber, activeTab]);

	// Handle "Ask AI" button click on a question card
	const handleAskAI = (questionNumber: string) => {
		setSelectedQuestionForChat(questionNumber);
		setActiveTab("chat");
	};

	return (
		<Tabs
			value={activeTab}
			onValueChange={setActiveTab}
			className="h-full flex flex-col gap-0 overflow-hidden"
		>
			<div className="bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-10 border-b shrink-0">
				<TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent">
					<TabsTrigger
						value="answers"
						className="flex-1 rounded-none py-3 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
					>
						Answers
					</TabsTrigger>
					<TabsTrigger
						value="chat"
						className="flex-1 rounded-none py-3 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
					>
						Ask AI
					</TabsTrigger>
				</TabsList>
			</div>

			<TabsContent value="answers" className="flex-1 min-h-0 overflow-hidden mt-0">
				<div ref={containerRef} className="h-full overflow-y-auto">
					<div className="space-y-3 p-4">
						{questions.map((question) => {
							const isActive = activeQuestionNumber === question.questionNumber;
							const isSelectedForChat = selectedQuestionForChat === question.questionNumber;
							return (
								<Card
									key={question.id}
									ref={(el) => {
										if (el) {
											cardRefs.current.set(question.questionNumber, el);
										} else {
											cardRefs.current.delete(question.questionNumber);
										}
									}}
									className={cn(
										"cursor-pointer transition-all duration-200 scroll-my-16",
										isActive && "ring-2 ring-primary shadow-md",
										isSelectedForChat && !isActive && "ring-1 ring-muted-foreground/30"
									)}
									onClick={() => {
										onQuestionClick(question.questionNumber);
										setSelectedQuestionForChat(question.questionNumber);
									}}
								>
									<CardHeader className="py-2 px-3">
										<CardTitle className="text-sm font-medium flex items-center justify-between">
											<span>Q{question.questionNumber}</span>
											<div className="flex items-center gap-2">
												{question.marks && (
													<span className="text-xs text-muted-foreground">
														{question.marks}{" "}
														{question.marks === 1 ? "mark" : "marks"}
													</span>
												)}
												<Button
													variant="ghost"
													size="sm"
													className="h-6 px-2 text-xs"
													onClick={(e) => {
														e.stopPropagation();
														handleAskAI(question.questionNumber);
													}}
												>
													<MessageCircle className="h-3 w-3 mr-1" />
													Ask AI
												</Button>
											</div>
										</CardTitle>
									</CardHeader>
									<CardContent
										className="py-2 px-3"
										onClick={(e) => e.stopPropagation()}
									>
										<CompactAnswerInput question={question} isActive={isActive} />
									</CardContent>
								</Card>
							);
						})}
					</div>
				</div>
			</TabsContent>

			<TabsContent value="chat" className="flex-1 min-h-0 overflow-hidden mt-0">
				{selectedQuestion ? (() => {
					const selectedSection = selectedQuestion.sectionId
						? sections.find((s) => s.id === selectedQuestion.sectionId)
						: undefined;
					return (
						<AIChatPanel
							examId={examId}
							question={selectedQuestion}
							questions={questions}
							onQuestionChange={setSelectedQuestionForChat}
							sectionName={selectedSection?.sectionName ?? null}
							sectionInstructions={selectedSection?.instructions ?? null}
						/>
					);
				})() : (
					<div className="flex items-center justify-center h-full text-muted-foreground text-sm">
						Select a question to start chatting
					</div>
				)}
			</TabsContent>
		</Tabs>
	);
}
