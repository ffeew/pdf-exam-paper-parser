"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { McqQuestion } from "./mcq-question";
import { FillBlankQuestion } from "./fill-blank-question";
import { ShortAnswerQuestion } from "./short-answer-question";
import { LongAnswerQuestion } from "./long-answer-question";
import { QuestionImage } from "./question-image";
import type { Question } from "@/app/api/exams/[id]/validator";

interface QuestionCardProps {
  question: Question;
}

export function QuestionCard({ question }: QuestionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">
            Question {question.questionNumber}
          </CardTitle>
          {question.marks && (
            <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
              {question.marks} {question.marks === 1 ? "mark" : "marks"}
            </span>
          )}
        </div>
        {question.section && (
          <p className="text-sm text-muted-foreground">
            Section: {question.section}
          </p>
        )}
        {question.instructions && (
          <p className="text-sm text-muted-foreground italic mt-1">
            {question.instructions}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Question images */}
        {question.images.length > 0 && (
          <div className="flex gap-4 flex-wrap">
            {question.images.map((img) => (
              <QuestionImage key={img.id} image={img} />
            ))}
          </div>
        )}

        {/* Question text */}
        <p className="text-base leading-relaxed whitespace-pre-wrap">
          {question.questionText}
        </p>

        {/* Answer input based on type */}
        <div className="pt-2">
          {question.questionType === "mcq" && (
            <McqQuestion questionId={question.id} options={question.options} />
          )}
          {question.questionType === "fill_blank" && (
            <FillBlankQuestion questionId={question.id} />
          )}
          {question.questionType === "short_answer" && (
            <ShortAnswerQuestion questionId={question.id} />
          )}
          {question.questionType === "long_answer" && (
            <LongAnswerQuestion questionId={question.id} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
