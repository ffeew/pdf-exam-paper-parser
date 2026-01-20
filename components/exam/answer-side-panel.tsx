"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CompactAnswerInput } from "./compact-answer-input";
import { ExamSummary } from "./exam-summary";
import { AIChatPanel } from "./ai-chat-panel";
import { cn } from "@/lib/utils";
import { MessageCircle, Eye, EyeOff } from "lucide-react";
import { AnswerReveal } from "./answer-reveal";
import { useExamAnswers, useSubmitAnswer } from "@/hooks/use-answers";
import type { Question, Section } from "@/app/api/exams/[id]/validator";

interface AnswerSidePanelProps {
	examId: string;
	questions: Question[];
	sections: Section[];
	activeQuestionNumber: string | null;
	onQuestionClick: (questionNumber: string) => void;
	// Lifted state for sync between views
	selectedQuestionForChat: string | null;
	onSelectedQuestionForChatChange: (questionNumber: string | null) => void;
	activeTab: "answers" | "chat";
	onActiveTabChange: (tab: "answers" | "chat") => void;
	revealedAnswers: Record<string, boolean>;
	onToggleAnswer: (questionNumber: string) => void;
}

export function AnswerSidePanel({
	examId,
	questions,
	sections,
	activeQuestionNumber,
	onQuestionClick,
	selectedQuestionForChat,
	onSelectedQuestionForChatChange,
	activeTab,
	onActiveTabChange,
	revealedAnswers,
	onToggleAnswer,
}: AnswerSidePanelProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	// Fetch answers and submit mutation
	const { data: answersData } = useExamAnswers({ examId });
	const submitMutation = useSubmitAnswer();

	// Create a map for quick answer lookup by questionId
	const answersMap = useMemo(() => {
		const map = new Map<string, NonNullable<typeof answersData>["answers"][number]>();
		answersData?.answers.forEach((a) => map.set(a.questionId, a));
		return map;
	}, [answersData]);

	// Handle answer change
	const handleAnswerChange = useCallback(
		(
			questionId: string,
			answerText: string | null,
			selectedOptionId: string | null,
			version?: number
		) => {
			submitMutation.mutate({
				examId,
				questionId,
				answerText,
				selectedOptionId,
				version,
			});
		},
		[examId, submitMutation]
	);

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
		onSelectedQuestionForChatChange(questionNumber);
		onActiveTabChange("chat");
	};

	// Check if question has an answer to reveal (expectedAnswer is used for all question types)
	const hasAnswer = (q: Question) => Boolean(q.expectedAnswer);

	return (
		<Tabs
			value={activeTab}
			onValueChange={(value) => onActiveTabChange(value as "answers" | "chat")}
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
						{/* Exam Summary */}
						<ExamSummary
							examId={examId}
							totalQuestions={questions.length}
							answers={answersData?.answers ?? []}
						/>

						{questions.map((question) => {
							const isActive = activeQuestionNumber === question.questionNumber;
							const isSelectedForChat = selectedQuestionForChat === question.questionNumber;
							const savedAnswer = answersMap.get(question.id);
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
										onSelectedQuestionForChatChange(question.questionNumber);
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
												{hasAnswer(question) && (
													<Button
														variant="ghost"
														size="sm"
														className="h-6 px-2 text-xs"
														onClick={(e) => {
															e.stopPropagation();
															onToggleAnswer(question.questionNumber);
														}}
													>
														{revealedAnswers[question.questionNumber] ? (
															<>
																<EyeOff className="h-3 w-3 mr-1" />
																Hide
															</>
														) : (
															<>
																<Eye className="h-3 w-3 mr-1" />
																Answer
															</>
														)}
													</Button>
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
										<CompactAnswerInput
											question={question}
											examId={examId}
											savedAnswer={savedAnswer}
											onAnswerChange={(answerText, selectedOptionId, version) =>
												handleAnswerChange(question.id, answerText, selectedOptionId, version)
											}
										/>
									</CardContent>
									{revealedAnswers[question.questionNumber] && (
										<div className="px-3 pb-2">
											<AnswerReveal question={question} />
										</div>
									)}
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
							onQuestionChange={onSelectedQuestionForChatChange}
							sectionName={selectedSection?.sectionName ?? null}
							sectionInstructions={selectedSection?.instructions ?? null}
							sectionContext={selectedSection?.context ?? null}
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
