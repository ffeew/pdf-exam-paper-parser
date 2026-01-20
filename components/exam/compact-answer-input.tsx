"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Question } from "@/app/api/exams/[id]/validator";

interface CompactAnswerInputProps {
	question: Question;
	isActive?: boolean;
}

export function CompactAnswerInput({
	question,
	isActive = false,
}: CompactAnswerInputProps) {
	const [answer, setAnswer] = useState("");
	const [selectedOption, setSelectedOption] = useState("");

	const baseClasses = cn(
		"transition-all duration-200",
		isActive && "ring-2 ring-primary ring-offset-2 rounded-md"
	);

	switch (question.questionType) {
		case "mcq":
			return (
				<div className={baseClasses}>
					<RadioGroup
						value={selectedOption}
						onValueChange={setSelectedOption}
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
				</div>
			);

		case "fill_blank":
			return (
				<div className={baseClasses}>
					<Input
						type="text"
						placeholder="Your answer..."
						value={answer}
						onChange={(e) => setAnswer(e.target.value)}
						className="h-8 text-sm"
					/>
				</div>
			);

		case "short_answer":
			return (
				<div className={baseClasses}>
					<Textarea
						placeholder="Your answer..."
						value={answer}
						onChange={(e) => setAnswer(e.target.value)}
						rows={2}
						className="resize-none text-sm min-h-15"
					/>
				</div>
			);

		case "long_answer":
			return (
				<div className={baseClasses}>
					<Textarea
						placeholder="Your answer..."
						value={answer}
						onChange={(e) => setAnswer(e.target.value)}
						rows={4}
						className="resize-y text-sm min-h-20"
					/>
				</div>
			);

		default:
			return (
				<div className={baseClasses}>
					<Input
						type="text"
						placeholder="Your answer..."
						value={answer}
						onChange={(e) => setAnswer(e.target.value)}
						className="h-8 text-sm"
					/>
				</div>
			);
	}
}
