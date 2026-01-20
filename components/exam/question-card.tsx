"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LatexText } from "@/components/ui/latex-text";
import { MarkdownText } from "@/components/ui/markdown-text";
import { McqQuestion } from "./mcq-question";
import { FillBlankQuestion } from "./fill-blank-question";
import { ShortAnswerQuestion } from "./short-answer-question";
import { LongAnswerQuestion } from "./long-answer-question";
import { QuestionImage } from "./question-image";
import { AnswerReveal } from "./answer-reveal";
import { MessageCircle, Eye, EyeOff } from "lucide-react";
import type { Question } from "@/app/api/exams/[id]/validator";

interface QuestionCardProps {
  question: Question;
  onAskAI?: (questionNumber: string) => void;
}

export function QuestionCard({ question, onAskAI }: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  // Check if answer is available
  const hasAnswer =
    question.expectedAnswer ||
    (question.questionType === "mcq" &&
      question.options.some((opt) => opt.isCorrect));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">
            Question {question.questionNumber}
          </CardTitle>
          <div className="flex items-center gap-2">
            {question.marks && (
              <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                {question.marks} {question.marks === 1 ? "mark" : "marks"}
              </span>
            )}
            {hasAnswer && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowAnswer(!showAnswer)}
              >
                {showAnswer ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hide Answer
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Show Answer
                  </>
                )}
              </Button>
            )}
            {onAskAI && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onAskAI(question.questionNumber)}
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Ask AI
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Question images */}
        {question.images.length > 0 && (
          <div
            className={
              question.images.length > 1
                ? "grid grid-cols-2 md:grid-cols-3 gap-4"
                : "flex"
            }
          >
            {question.images.map((img) => (
              <QuestionImage key={img.id} image={img} />
            ))}
          </div>
        )}

        {/* Question context - contextual content needed to answer the question */}
        {question.context && (
          <div className="bg-muted/30 border-l-4 border-primary/50 p-3 rounded-r-md">
            <MarkdownText
              text={question.context}
              className="text-sm leading-relaxed"
            />
          </div>
        )}

        {/* Question text */}
        <LatexText
          text={question.questionText}
          className="text-base leading-relaxed block"
        />

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

        {/* Answer reveal */}
        {showAnswer && <AnswerReveal question={question} />}
      </CardContent>
    </Card>
  );
}
