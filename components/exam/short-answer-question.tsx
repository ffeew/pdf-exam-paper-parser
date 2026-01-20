"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ShortAnswerQuestionProps {
  questionId: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function ShortAnswerQuestion({
  questionId,
  value = "",
  onChange,
}: ShortAnswerQuestionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`answer-${questionId}`}>Your Answer</Label>
      <Textarea
        id={`answer-${questionId}`}
        placeholder="Enter your answer..."
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        rows={3}
        className="resize-none"
      />
    </div>
  );
}
