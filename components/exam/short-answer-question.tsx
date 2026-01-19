"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ShortAnswerQuestionProps {
  questionId: string;
}

export function ShortAnswerQuestion({ questionId }: ShortAnswerQuestionProps) {
  const [answer, setAnswer] = useState("");

  return (
    <div className="space-y-2">
      <Label htmlFor={`answer-${questionId}`}>Your Answer</Label>
      <Textarea
        id={`answer-${questionId}`}
        placeholder="Enter your answer..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        className="resize-none"
      />
    </div>
  );
}
