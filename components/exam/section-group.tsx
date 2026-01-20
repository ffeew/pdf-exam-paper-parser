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
      {(sectionName || sectionInstructions) && (
        <Card className="bg-muted/50 border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            {sectionName && (
              <CardTitle className="text-xl">
                <LatexText text={sectionName} />
              </CardTitle>
            )}
          </CardHeader>
          {sectionInstructions && (
            <CardContent className="pt-0">
              <MarkdownText
                text={sectionInstructions}
                className="text-muted-foreground"
              />
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
