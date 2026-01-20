"use client";

import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface GradeFeedbackProps {
  isCorrect: boolean | null;
  score: number | null;
  maxScore: number | null;
  feedback: string | null;
  gradingStatus: "pending" | "grading" | "graded" | "error" | null;
  className?: string;
}

export function GradeFeedback({
  isCorrect,
  score,
  maxScore,
  feedback,
  gradingStatus,
  className,
}: GradeFeedbackProps) {
  // Show nothing for pending status (not yet graded)
  if (gradingStatus === "pending" || !gradingStatus) {
    return null;
  }

  // Show loading state while grading
  if (gradingStatus === "grading") {
    return (
      <div
        className={cn(
          "mt-2 p-2 bg-muted rounded-md flex items-center gap-2",
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Grading...</span>
      </div>
    );
  }

  // Show error state
  if (gradingStatus === "error") {
    return (
      <div
        className={cn(
          "mt-2 p-2 rounded-md border bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900",
          className
        )}
      >
        <div className="flex items-center gap-1">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
            Grading failed
          </span>
        </div>
        {feedback && (
          <p className="text-sm text-muted-foreground mt-1">{feedback}</p>
        )}
      </div>
    );
  }

  // Show graded result
  const bgColor = isCorrect
    ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
    : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900";

  const textColor = isCorrect
    ? "text-green-700 dark:text-green-400"
    : "text-red-700 dark:text-red-400";

  return (
    <div className={cn("mt-2 p-2 rounded-md border", bgColor, className)}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          {isCorrect ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <span className={cn("text-sm font-medium", textColor)}>
            {isCorrect ? "Correct" : "Incorrect"}
          </span>
        </div>
        {score !== null && maxScore !== null && (
          <span className="text-sm text-muted-foreground">
            {score}/{maxScore}
          </span>
        )}
      </div>
      {feedback && (
        <p className="text-sm text-muted-foreground">{feedback}</p>
      )}
    </div>
  );
}
