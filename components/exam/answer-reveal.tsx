"use client";

import { LatexText } from "@/components/ui/latex-text";
import { CheckCircle2 } from "lucide-react";
import type { Question } from "@/app/api/exams/[id]/validator";

interface AnswerRevealProps {
  question: Question;
}

export function AnswerReveal({ question }: AnswerRevealProps) {
  // For MCQ, find the correct option using expectedAnswer (stores the option label)
  if (question.questionType === "mcq") {
    const correctOptionLabel = question.expectedAnswer?.toUpperCase().trim();
    const correctOption = correctOptionLabel
      ? question.options.find(
          (opt) => opt.optionLabel.toUpperCase().trim() === correctOptionLabel
        )
      : null;

    if (!correctOption && !question.expectedAnswer) {
      return (
        <div className="text-sm text-muted-foreground italic">
          No answer available
        </div>
      );
    }

    return (
      <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-md">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500 mt-0.5 shrink-0" />
        <div className="text-sm">
          <span className="font-medium text-green-700 dark:text-green-400">
            Correct answer: {correctOption?.optionLabel ?? question.expectedAnswer}
          </span>
          {correctOption?.optionText && (
            <span className="text-green-600 dark:text-green-500">
              {" "}
              — <LatexText text={correctOption.optionText} />
            </span>
          )}
        </div>
      </div>
    );
  }

  // For other question types, show expectedAnswer
  if (!question.expectedAnswer) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No answer available
      </div>
    );
  }

  return (
    <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-md">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500 mt-0.5 shrink-0" />
        <div className="text-sm">
          <span className="font-medium text-green-700 dark:text-green-400">
            Answer:{" "}
          </span>
          <LatexText
            text={question.expectedAnswer}
            className="text-green-600 dark:text-green-500"
          />
        </div>
      </div>
    </div>
  );
}
