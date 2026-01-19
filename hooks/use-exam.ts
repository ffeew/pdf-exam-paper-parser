"use client";

import { useQuery } from "@tanstack/react-query";
import type { ExamWithQuestions, ExamStatus } from "@/app/api/exams/[id]/validator";

async function fetchExam(id: string): Promise<ExamWithQuestions> {
  const response = await fetch(`/api/exams/${id}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch exam");
  }
  return response.json();
}

async function fetchExamStatus(id: string): Promise<ExamStatus> {
  const response = await fetch(`/api/exams/${id}?status=true`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch exam status");
  }
  return response.json();
}

export function useExam(id: string) {
  return useQuery({
    queryKey: ["exam", id],
    queryFn: () => fetchExam(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useExamStatus(id: string, options?: { enabled?: boolean; refetchInterval?: number | false }) {
  return useQuery({
    queryKey: ["exam-status", id],
    queryFn: () => fetchExamStatus(id),
    staleTime: 0, // Always fresh for status polling
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled,
  });
}
