"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FillBlankQuestionProps {
  questionId: string;
}

export function FillBlankQuestion({ questionId }: FillBlankQuestionProps) {
  const [answer, setAnswer] = useState("");

  return (
    <div className="space-y-2">
      <Label htmlFor={`answer-${questionId}`}>Your Answer</Label>
      <Input
        id={`answer-${questionId}`}
        type="text"
        placeholder="Enter your answer..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        className="max-w-md"
      />
    </div>
  );
}
