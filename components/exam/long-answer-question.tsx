"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface LongAnswerQuestionProps {
  questionId: string;
}

export function LongAnswerQuestion({ questionId }: LongAnswerQuestionProps) {
  const [answer, setAnswer] = useState("");

  return (
    <div className="space-y-2">
      <Label htmlFor={`answer-${questionId}`}>Your Answer</Label>
      <Textarea
        id={`answer-${questionId}`}
        placeholder="Write your answer here. Show your working where applicable..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={8}
        className="resize-y min-h-[120px]"
      />
    </div>
  );
}
