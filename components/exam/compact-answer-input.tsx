"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { GradeFeedback } from "./grade-feedback";
import { GradeButton } from "./grade-button";
import type { Question } from "@/app/api/exams/[id]/validator";
import type { UserAnswer } from "@/app/api/answers/validator";

interface CompactAnswerInputProps {
	question: Question;
	examId: string;
	savedAnswer?: UserAnswer;
	onAnswerChange?: (
		answerText: string | null,
		selectedOptionId: string | null,
		version?: number
	) => void;
}

export function CompactAnswerInput({
	question,
	examId,
	savedAnswer,
	onAnswerChange,
}: CompactAnswerInputProps) {
	// Local state for text inputs - initialized from savedAnswer on mount
	// Parent component should use key={question.id} to remount when question changes
	const [localAnswer, setLocalAnswer] = useState(savedAnswer?.answerText ?? "");
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	// Track latest text value for debounced save to always use current value
	const latestTextRef = useRef(savedAnswer?.answerText ?? "");
	// Track save version to handle race conditions
	const saveVersionRef = useRef(0);
	// Keep latest callback ref to avoid stale closures
	const onAnswerChangeRef = useRef(onAnswerChange);
	useEffect(() => {
		onAnswerChangeRef.current = onAnswerChange;
	}, [onAnswerChange]);

	const displayOption = savedAnswer?.selectedOptionId ?? "";

	// Handle text input change with debounced save
	const handleTextChange = (value: string) => {
		setLocalAnswer(value);
		latestTextRef.current = value;

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(() => {
			saveVersionRef.current += 1;
			const currentVersion = saveVersionRef.current;
			// Use refs to always get latest values, avoiding stale closures
			onAnswerChangeRef.current?.(latestTextRef.current || null, null, currentVersion);
			debounceTimerRef.current = null;
		}, 1000);
	};

	// Handle MCQ option change (immediate save)
	const handleOptionChange = (optionId: string) => {
		onAnswerChange?.(null, optionId);
	};

	const hasAnswer = Boolean(localAnswer || displayOption);
	const showGradeControls = savedAnswer && (savedAnswer.answerText || savedAnswer.selectedOptionId);

	const baseClasses = "transition-all duration-200";

	const renderGradeSection = () => (
		<>
			{showGradeControls && (
				<div className="flex items-center justify-between mt-2">
					<GradeButton
						examId={examId}
						questionId={question.id}
						hasAnswer={hasAnswer}
						gradingStatus={savedAnswer?.gradingStatus ?? null}
						size="sm"
					/>
				</div>
			)}
			{savedAnswer && savedAnswer.gradingStatus && savedAnswer.gradingStatus !== "pending" && (
				<GradeFeedback
					isCorrect={savedAnswer.isCorrect}
					score={savedAnswer.score}
					maxScore={savedAnswer.maxScore}
					feedback={savedAnswer.feedback}
					gradingStatus={savedAnswer.gradingStatus}
				/>
			)}
		</>
	);

	switch (question.questionType) {
		case "mcq":
			return (
				<div className={baseClasses} onClick={(e) => e.stopPropagation()}>
					<RadioGroup
						value={displayOption}
						onValueChange={handleOptionChange}
						className="flex flex-wrap gap-2"
					>
						{question.options.map((option) => (
							<div key={option.id} className="flex items-center">
								<RadioGroupItem
									value={option.id}
									id={`compact-${question.id}-${option.id}`}
									className="peer sr-only"
								/>
								<Label
									htmlFor={`compact-${question.id}-${option.id}`}
									className={cn(
										"cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
										"hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
									)}
								>
									{option.optionLabel}
								</Label>
							</div>
						))}
					</RadioGroup>
					{renderGradeSection()}
				</div>
			);

		case "fill_blank":
			return (
				<div className={baseClasses}>
					<Input
						type="text"
						placeholder="Your answer..."
						value={localAnswer}
						onChange={(e) => handleTextChange(e.target.value)}
						className="h-8 text-sm"
					/>
					{renderGradeSection()}
				</div>
			);

		case "short_answer":
			return (
				<div className={baseClasses}>
					<Textarea
						placeholder="Your answer..."
						value={localAnswer}
						onChange={(e) => handleTextChange(e.target.value)}
						rows={2}
						className="resize-none text-sm min-h-15"
					/>
					{renderGradeSection()}
				</div>
			);

		case "long_answer":
			return (
				<div className={baseClasses}>
					<Textarea
						placeholder="Your answer..."
						value={localAnswer}
						onChange={(e) => handleTextChange(e.target.value)}
						rows={4}
						className="resize-y text-sm min-h-20"
					/>
					{renderGradeSection()}
				</div>
			);

		default:
			return (
				<div className={baseClasses}>
					<Input
						type="text"
						placeholder="Your answer..."
						value={localAnswer}
						onChange={(e) => handleTextChange(e.target.value)}
						className="h-8 text-sm"
					/>
					{renderGradeSection()}
				</div>
			);
	}
}
