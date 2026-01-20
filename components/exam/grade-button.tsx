"use client";

import { Loader2, CheckSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGradeAnswer } from "@/hooks/use-answers";

interface GradeButtonProps {
  examId: string;
  questionId: string;
  hasAnswer: boolean;
  gradingStatus: "pending" | "grading" | "graded" | "error" | null;
  size?: "default" | "sm";
}

export function GradeButton({
  examId,
  questionId,
  hasAnswer,
  gradingStatus,
  size = "sm",
}: GradeButtonProps) {
  const gradeMutation = useGradeAnswer();

  const isGraded = gradingStatus === "graded";
  const isGrading =
    gradingStatus === "grading" || gradeMutation.isPending;
  const isError = gradingStatus === "error";

  const handleGrade = () => {
    gradeMutation.mutate({ examId, questionId, model: "kimi-k2" });
  };

  return (
    <Button
      variant={isGraded ? "outline" : "default"}
      size={size}
      onClick={handleGrade}
      disabled={!hasAnswer || isGrading}
    >
      {isGrading ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Grading...
        </>
      ) : isGraded || isError ? (
        <>
          <RefreshCw className="h-3 w-3" />
          Regrade
        </>
      ) : (
        <>
          <CheckSquare className="h-3 w-3" />
          Grade
        </>
      )}
    </Button>
  );
}
