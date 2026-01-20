"use client";

import { Loader2, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useGradeExam } from "@/hooks/use-answers";
import type { UserAnswer } from "@/app/api/answers/validator";

interface ExamSummaryProps {
  examId: string;
  totalQuestions: number;
  answers: UserAnswer[];
}

export function ExamSummary({
  examId,
  totalQuestions,
  answers,
}: ExamSummaryProps) {
  const gradeExamMutation = useGradeExam();

  const answeredCount = answers.filter(
    (a) => a.answerText || a.selectedOptionId
  ).length;
  const gradedCount = answers.filter(
    (a) => a.gradingStatus === "graded"
  ).length;
  const pendingCount = answers.filter(
    (a) =>
      (a.answerText || a.selectedOptionId) &&
      a.gradingStatus !== "graded"
  ).length;

  const totalScore = answers
    .filter((a) => a.gradingStatus === "graded")
    .reduce((sum, a) => sum + (a.score ?? 0), 0);
  const totalMaxScore = answers
    .filter((a) => a.gradingStatus === "graded")
    .reduce((sum, a) => sum + (a.maxScore ?? 0), 0);

  const scorePercentage =
    totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
  const answerProgress =
    totalQuestions > 0
      ? Math.round((answeredCount / totalQuestions) * 100)
      : 0;

  const handleGradeAll = () => {
    gradeExamMutation.mutate({ examId, model: "kimi-k2" });
  };

  return (
    <Card className="py-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Answer progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Answered</span>
            <span>
              {answeredCount}/{totalQuestions}
            </span>
          </div>
          <Progress value={answerProgress} className="h-2" />
        </div>

        {/* Grading progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Graded</span>
            <span>
              {gradedCount}/{answeredCount || 0}
            </span>
          </div>
        </div>

        {/* Score (only show if any answers graded) */}
        {gradedCount > 0 && (
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm font-medium">
              <span>Score</span>
              <span>
                {totalScore}/{totalMaxScore} ({scorePercentage}%)
              </span>
            </div>
          </div>
        )}

        {/* Grade All button */}
        <Button
          className="w-full"
          onClick={handleGradeAll}
          disabled={pendingCount === 0 || gradeExamMutation.isPending}
        >
          {gradeExamMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Grading...
            </>
          ) : (
            <>
              <CheckSquare className="h-4 w-4" />
              Grade All ({pendingCount})
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
