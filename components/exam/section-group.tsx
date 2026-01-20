"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LatexText } from "@/components/ui/latex-text";
import { MarkdownText } from "@/components/ui/markdown-text";
import { QuestionCard } from "./question-card";
import type { Question } from "@/app/api/exams/[id]/validator";
import type { UserAnswer } from "@/app/api/answers/validator";

interface SectionGroupProps {
  sectionName: string | null;
  sectionInstructions: string | null;
  sectionContext: string | null;
  questions: Question[];
  examId?: string;
  answersMap?: Map<string, UserAnswer>;
  onAnswerChange?: (
    questionId: string,
    answerText: string | null,
    selectedOptionId: string | null,
    version?: number
  ) => void;
  onAskAI?: (questionNumber: string) => void;
  // Optional controlled props for answer reveal sync
  revealedAnswers?: Record<string, boolean>;
  onToggleAnswer?: (questionNumber: string) => void;
}

export function SectionGroup({
  sectionName,
  sectionInstructions,
  sectionContext,
  questions,
  examId,
  answersMap,
  onAnswerChange,
  onAskAI,
  revealedAnswers,
  onToggleAnswer,
}: SectionGroupProps) {
  return (
    <div className="space-y-4">
      {/* Section Header */}
      {(sectionName || sectionInstructions || sectionContext) && (
        <Card className="bg-muted/50 border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            {sectionName && (
              <CardTitle className="text-xl">
                <LatexText text={sectionName} />
              </CardTitle>
            )}
          </CardHeader>
          {(sectionInstructions || sectionContext) && (
            <CardContent className="pt-0 space-y-3">
              {sectionInstructions && (
                <div className="text-muted-foreground">
                  <MarkdownText text={sectionInstructions} />
                </div>
              )}
              {sectionContext && (
                <div className="bg-background/50 border-l-4 border-primary/30 p-3 rounded-r-md">
                  <MarkdownText
                    text={sectionContext}
                    className="text-sm leading-relaxed"
                  />
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Questions in this section */}
      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          examId={examId}
          savedAnswer={answersMap?.get(question.id)}
          onAnswerChange={
            onAnswerChange
              ? (answerText, selectedOptionId, version) =>
                  onAnswerChange(question.id, answerText, selectedOptionId, version)
              : undefined
          }
          onAskAI={onAskAI}
          showAnswer={revealedAnswers?.[question.questionNumber]}
          onToggleAnswer={
            onToggleAnswer
              ? () => onToggleAnswer(question.questionNumber)
              : undefined
          }
        />
      ))}
    </div>
  );
}
