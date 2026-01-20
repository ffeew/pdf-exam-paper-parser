"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FillBlankQuestionProps {
  questionId: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function FillBlankQuestion({
  questionId,
  value = "",
  onChange,
}: FillBlankQuestionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`answer-${questionId}`}>Your Answer</Label>
      <Input
        id={`answer-${questionId}`}
        type="text"
        placeholder="Enter your answer..."
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="max-w-md"
      />
    </div>
  );
}
