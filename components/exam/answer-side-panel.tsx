"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompactAnswerInput } from "./compact-answer-input";
import { cn } from "@/lib/utils";
import type { Question } from "@/app/api/exams/[id]/validator";

interface AnswerSidePanelProps {
	questions: Question[];
	activeQuestionNumber: string | null;
	onQuestionClick: (questionNumber: string) => void;
}

export function AnswerSidePanel({
	questions,
	activeQuestionNumber,
	onQuestionClick,
}: AnswerSidePanelProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	// Auto-scroll to active question when it changes
	useEffect(() => {
		if (activeQuestionNumber && containerRef.current) {
			const card = cardRefs.current.get(activeQuestionNumber);
			if (card) {
				// Use scrollIntoView with block: "nearest" to scroll minimum amount needed
				card.scrollIntoView({ behavior: "smooth", block: "nearest" });
			}
		}
	}, [activeQuestionNumber]);

	return (
		<div ref={containerRef} className="h-full overflow-y-auto">
			<div className="sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-10 pb-2 border-b">
				<h2 className="text-lg font-semibold px-4 py-3">Answers</h2>
			</div>
			<div className="space-y-3 p-4">
				{questions.map((question) => {
					const isActive = activeQuestionNumber === question.questionNumber;
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
								isActive && "ring-2 ring-primary shadow-md"
							)}
							onClick={() => onQuestionClick(question.questionNumber)}
						>
							<CardHeader className="py-2 px-3">
								<CardTitle className="text-sm font-medium flex items-center justify-between">
									<span>Q{question.questionNumber}</span>
									{question.marks && (
										<span className="text-xs text-muted-foreground">
											{question.marks} {question.marks === 1 ? "mark" : "marks"}
										</span>
									)}
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
	);
}
