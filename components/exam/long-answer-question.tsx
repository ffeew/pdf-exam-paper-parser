"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface LongAnswerQuestionProps {
  questionId: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function LongAnswerQuestion({
  questionId,
  value = "",
  onChange,
}: LongAnswerQuestionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`answer-${questionId}`}>Your Answer</Label>
      <Textarea
        id={`answer-${questionId}`}
        placeholder="Write your answer here. Show your working where applicable..."
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        rows={8}
        className="resize-y min-h-[120px]"
      />
    </div>
  );
}
