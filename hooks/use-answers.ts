"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UserAnswer,
  GetAnswersResponse,
  SubmitAnswerRequest,
} from "@/app/api/answers/validator";
import type { GradeResult } from "@/app/api/answers/grade/validator";
import type { GradeExamResponse } from "@/app/api/answers/grade-exam/validator";

// Fetch functions
async function fetchAnswers(examId: string): Promise<GetAnswersResponse> {
  const params = new URLSearchParams({ examId });
  const response = await fetch(`/api/answers?${params}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch answers");
  }

  return response.json();
}

async function submitAnswer(data: SubmitAnswerRequest): Promise<UserAnswer> {
  const response = await fetch("/api/answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to submit answer");
  }

  return response.json();
}

async function gradeAnswer(data: {
  examId: string;
  questionId: string;
  model?: string;
}): Promise<GradeResult> {
  const response = await fetch("/api/answers/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to grade answer");
  }

  return response.json();
}

async function gradeExam(data: {
  examId: string;
  model?: string;
}): Promise<GradeExamResponse> {
  const response = await fetch("/api/answers/grade-exam", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to grade exam");
  }

  return response.json();
}

// Hooks
interface UseExamAnswersOptions {
  examId: string;
  enabled?: boolean;
}

export function useExamAnswers({
  examId,
  enabled = true,
}: UseExamAnswersOptions) {
  return useQuery({
    queryKey: ["answers", examId],
    queryFn: () => fetchAnswers(examId),
    enabled,
    staleTime: 0,
  });
}

export function useSubmitAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitAnswer,
    onSuccess: (data, variables) => {
      // Update cache with new answer
      queryClient.setQueryData<GetAnswersResponse>(
        ["answers", variables.examId],
        (old) => {
          if (!old) return { answers: [data] };

          const existingIndex = old.answers.findIndex(
            (a) => a.questionId === variables.questionId
          );

          if (existingIndex >= 0) {
            const newAnswers = [...old.answers];
            newAnswers[existingIndex] = data;
            return { answers: newAnswers };
          }

          return { answers: [...old.answers, data] };
        }
      );
    },
  });
}

export function useGradeAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: gradeAnswer,
    onMutate: async (variables) => {
      // Optimistically update grading status to "grading"
      await queryClient.cancelQueries({
        queryKey: ["answers", variables.examId],
      });

      const previousData = queryClient.getQueryData<GetAnswersResponse>([
        "answers",
        variables.examId,
      ]);

      queryClient.setQueryData<GetAnswersResponse>(
        ["answers", variables.examId],
        (old) => {
          if (!old) return old;

          return {
            answers: old.answers.map((a) =>
              a.questionId === variables.questionId
                ? { ...a, gradingStatus: "grading" as const }
                : a
            ),
          };
        }
      );

      return { previousData };
    },
    onSuccess: (data, variables) => {
      // Update with actual grade result
      queryClient.setQueryData<GetAnswersResponse>(
        ["answers", variables.examId],
        (old) => {
          if (!old) return old;

          return {
            answers: old.answers.map((a) =>
              a.questionId === variables.questionId
                ? {
                    ...a,
                    isCorrect: data.isCorrect,
                    score: data.score,
                    maxScore: data.maxScore,
                    feedback: data.feedback,
                    gradingStatus: "graded" as const,
                    gradingModel: data.gradingModel,
                    gradedAt: data.gradedAt,
                  }
                : a
            ),
          };
        }
      );
    },
    onError: (_error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["answers", variables.examId],
          context.previousData
        );
      }
    },
  });
}

export function useGradeExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: gradeExam,
    onSuccess: (_data, variables) => {
      // Refetch all answers to get updated grades
      queryClient.invalidateQueries({
        queryKey: ["answers", variables.examId],
      });
    },
  });
}
