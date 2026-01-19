"use client";

import { useQuery } from "@tanstack/react-query";
import type { ListExamsResponse } from "@/app/api/exams/validator";

interface UseExamsOptions {
  limit?: number;
  offset?: number;
}

async function fetchExams(options: UseExamsOptions): Promise<ListExamsResponse> {
  const params = new URLSearchParams();
  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  if (options.offset !== undefined) {
    params.set("offset", String(options.offset));
  }

  const url = `/api/exams${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to fetch exams");
  }

  return response.json();
}

export function useExams(options: UseExamsOptions = {}) {
  return useQuery({
    queryKey: ["exams", options],
    queryFn: () => fetchExams(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
