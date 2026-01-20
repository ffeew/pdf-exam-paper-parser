"use client";

import { use, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useExam } from "@/hooks/use-exam";
import { useExamAnswers, useSubmitAnswer } from "@/hooks/use-answers";
import { ExamHeader } from "@/components/exam/exam-header";
import { SectionGroup } from "@/components/exam/section-group";
import { QuestionImage } from "@/components/exam/question-image";
import { ExamSummary } from "@/components/exam/exam-summary";
import {
	ExamViewToggle,
	type ViewMode,
} from "@/components/exam/exam-view-toggle";
import { DocumentView } from "@/components/exam/document-view";
import { AIChatPanel } from "@/components/exam/ai-chat-panel";
import type { Question, Section } from "@/app/api/exams/[id]/validator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function ExamSkeleton() {
	return (
		<div className="p-8 max-w-4xl mx-auto space-y-6">
			<Skeleton className="h-32 w-full" />
			<Skeleton className="h-48 w-full" />
			<Skeleton className="h-48 w-full" />
			<Skeleton className="h-48 w-full" />
		</div>
	);
}

function ProcessingState() {
	return (
		<div className="p-8 max-w-4xl mx-auto">
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
					<p className="text-lg text-muted-foreground">
						Processing your exam paper...
					</p>
					<p className="text-sm text-muted-foreground">
						This may take a moment. Please wait.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

function ErrorState({ message }: { message: string }) {
	return (
		<div className="p-8 max-w-4xl mx-auto">
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
					<div className="text-4xl">Error</div>
					<p className="text-lg text-destructive">Failed to process exam</p>
					<p className="text-sm text-muted-foreground">{message}</p>
				</CardContent>
			</Card>
		</div>
	);
}

interface SectionGroupData {
	sectionName: string | null;
	sectionInstructions: string | null;
	questions: Question[];
}

function groupQuestionsBySection(
	sectionsData: Section[],
	questionsData: Question[]
): SectionGroupData[] {
	// Build a map of sectionId -> Section
	const sectionMap = new Map<string, Section>();
	for (const section of sectionsData) {
		sectionMap.set(section.id, section);
	}

	// Group questions by sectionId
	const questionsBySectionId = new Map<string | null, Question[]>();
	for (const question of questionsData) {
		const key = question.sectionId;
		const existing = questionsBySectionId.get(key) || [];
		existing.push(question);
		questionsBySectionId.set(key, existing);
	}

	const groups: SectionGroupData[] = [];

	// Add sections in order with their questions
	for (const section of sectionsData) {
		const sectionQuestions = questionsBySectionId.get(section.id) || [];
		if (sectionQuestions.length > 0) {
			groups.push({
				sectionName: section.sectionName || null,
				sectionInstructions: section.instructions,
				questions: sectionQuestions,
			});
		}
	}

	// Add questions without a section (sectionId is null)
	const unsectionedQuestions = questionsBySectionId.get(null) || [];
	if (unsectionedQuestions.length > 0) {
		groups.push({
			sectionName: null,
			sectionInstructions: null,
			questions: unsectionedQuestions,
		});
	}

	return groups;
}

export default function ExamPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const router = useRouter();
	const { data: session, isPending: isSessionLoading } = useSession();
	const { data: exam, isLoading, error } = useExam(id);
	const { data: answersData } = useExamAnswers({ examId: id });
	const submitMutation = useSubmitAnswer();
	const [viewMode, setViewMode] = useState<ViewMode>("structured");
	const [selectedQuestionForChat, setSelectedQuestionForChat] = useState<
		string | null
	>(null);
	const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
	const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
	const [documentViewActiveTab, setDocumentViewActiveTab] = useState<"answers" | "chat">("answers");

	// Create a map for quick answer lookup by questionId
	const answersMap = useMemo(() => {
		const map = new Map<string, NonNullable<typeof answersData>["answers"][number]>();
		answersData?.answers.forEach((a) => map.set(a.questionId, a));
		return map;
	}, [answersData]);

	// Handle answer change
	const handleAnswerChange = useCallback(
		(questionId: string, answerText: string | null, selectedOptionId: string | null) => {
			submitMutation.mutate({
				examId: id,
				questionId,
				answerText,
				selectedOptionId,
			});
		},
		[id, submitMutation]
	);

	// Handle "Ask AI" button click - opens panel and selects question
	const handleAskAI = (questionNumber: string) => {
		setSelectedQuestionForChat(questionNumber);
		setIsChatPanelOpen(true);
	};

	// Handle toggling answer visibility
	const handleToggleAnswer = useCallback((questionNumber: string) => {
		setRevealedAnswers(prev => ({
			...prev,
			[questionNumber]: !prev[questionNumber],
		}));
	}, []);

	// Handle document view tab change - keeps chat panel state in sync
	const handleDocumentViewTabChange = useCallback((tab: "answers" | "chat") => {
		setDocumentViewActiveTab(tab);
		setIsChatPanelOpen(tab === "chat");
	}, []);

	// Handle view mode change with state sync
	const handleViewModeChange = useCallback((newMode: ViewMode) => {
		// When switching to document view, sync the active tab with chat panel state
		if (newMode === "document" && isChatPanelOpen) {
			setDocumentViewActiveTab("chat");
		}
		setViewMode(newMode);
	}, [isChatPanelOpen]);

	// Redirect to login if not authenticated
	useEffect(() => {
		if (!isSessionLoading && !session) {
			router.push("/login");
		}
	}, [session, isSessionLoading, router]);

	if (isSessionLoading || isLoading) {
		return <ExamSkeleton />;
	}

	if (error) {
		return (
			<div className="p-8 max-w-4xl mx-auto">
				<Card>
					<CardContent className="py-8 text-center">
						<p className="text-destructive">Failed to load exam</p>
						<p className="text-sm text-muted-foreground mt-2">
							{error.message}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!exam) {
		return (
			<div className="p-8 max-w-4xl mx-auto">
				<Card>
					<CardContent className="py-8 text-center">
						<p className="text-muted-foreground">Exam not found</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (exam.status === "processing" || exam.status === "pending") {
		return <ProcessingState />;
	}

	if (exam.status === "failed") {
		return <ErrorState message={exam.errorMessage || "Unknown error"} />;
	}

	const hasDocumentMarkdown = Boolean(exam.documentMarkdown);

	return (
		<div className="fixed inset-0 left-64 flex flex-col overflow-hidden bg-background">
			<div className="w-full max-w-7xl mx-auto p-8 flex flex-col flex-1 min-h-0">
				<ExamHeader exam={exam} />

				{hasDocumentMarkdown && (
					<div className="flex items-center gap-3 mt-6 mb-4 shrink-0">
						<span className="text-sm text-muted-foreground">View:</span>
						<ExamViewToggle view={viewMode} onViewChange={handleViewModeChange} />
					</div>
				)}

				{viewMode === "document" && hasDocumentMarkdown ? (
					<div className="flex-1 min-h-0">
						<DocumentView
							examId={id}
							markdown={exam.documentMarkdown!}
							questions={exam.questions}
							sections={exam.sections}
							selectedQuestionForChat={selectedQuestionForChat}
							onSelectedQuestionForChatChange={setSelectedQuestionForChat}
							activeTab={documentViewActiveTab}
							onActiveTabChange={handleDocumentViewTabChange}
							revealedAnswers={revealedAnswers}
							onToggleAnswer={handleToggleAnswer}
						/>
					</div>
				) : (
					<div
						className={cn(
							"flex flex-1 gap-4 min-h-0",
							!hasDocumentMarkdown && "mt-6"
						)}
					>
						{/* Main content - Questions */}
						<div
							className={cn(
								"overflow-y-auto rounded-lg transition-all duration-300",
								isChatPanelOpen ? "flex-[0_0_65%]" : "flex-1"
							)}
						>
							{/* Exam Summary */}
							<div className="mb-6">
								<ExamSummary
									examId={id}
									totalQuestions={exam.questions.length}
									answers={answersData?.answers ?? []}
								/>
							</div>

							{/* Exam-level images (not linked to specific questions) */}
							{exam.examImages && exam.examImages.length > 0 && (
								<Card className="mb-8">
									<CardHeader>
										<CardTitle className="text-lg">
											Exam Reference Materials
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="flex gap-4 flex-wrap">
											{exam.examImages.map((img) => (
												<QuestionImage key={img.id} image={img} />
											))}
										</div>
									</CardContent>
								</Card>
							)}

							<div className="space-y-8">
								{groupQuestionsBySection(exam.sections, exam.questions).map(
									(group, index) => (
										<SectionGroup
											key={`section-${index}`}
											sectionName={group.sectionName}
											sectionInstructions={group.sectionInstructions}
											questions={group.questions}
											examId={id}
											answersMap={answersMap}
											onAnswerChange={handleAnswerChange}
											onAskAI={handleAskAI}
											revealedAnswers={revealedAnswers}
											onToggleAnswer={handleToggleAnswer}
										/>
									)
								)}
							</div>

							{exam.questions.length === 0 && (
								<Card>
									<CardContent className="py-8 text-center">
										<p className="text-muted-foreground">
											No questions found in this exam.
										</p>
									</CardContent>
								</Card>
							)}
						</div>

						{/* Side Panel - Ask AI (only visible when open) */}
						{isChatPanelOpen && (() => {
							const selectedQuestion = selectedQuestionForChat
								? exam.questions.find((q) => q.questionNumber === selectedQuestionForChat)
								: undefined;
							const selectedSection = selectedQuestion?.sectionId
								? exam.sections.find((s) => s.id === selectedQuestion.sectionId)
								: undefined;

							return (
								<div className="rounded-lg border bg-card overflow-hidden flex-[0_0_35%]">
									{selectedQuestion ? (
										<AIChatPanel
											examId={id}
											question={selectedQuestion}
											questions={exam.questions}
											onQuestionChange={setSelectedQuestionForChat}
											onClose={() => setIsChatPanelOpen(false)}
											sectionName={selectedSection?.sectionName ?? null}
											sectionInstructions={selectedSection?.instructions ?? null}
										/>
									) : (
										<div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
											Select a question to start chatting
										</div>
									)}
								</div>
							);
						})()}
					</div>
				)}
			</div>
		</div>
	);
}
