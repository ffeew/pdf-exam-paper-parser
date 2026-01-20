"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LatexText } from "@/components/ui/latex-text";
import { McqQuestion } from "./mcq-question";
import { FillBlankQuestion } from "./fill-blank-question";
import { ShortAnswerQuestion } from "./short-answer-question";
import { LongAnswerQuestion } from "./long-answer-question";
import { QuestionImage } from "./question-image";
import { AnswerReveal } from "./answer-reveal";
import { GradeFeedback } from "./grade-feedback";
import { GradeButton } from "./grade-button";
import { MessageCircle, Eye, EyeOff } from "lucide-react";
import type { Question } from "@/app/api/exams/[id]/validator";
import type { UserAnswer } from "@/app/api/answers/validator";

interface QuestionCardProps {
  question: Question;
  examId?: string;
  savedAnswer?: UserAnswer;
  onAnswerChange?: (
    answerText: string | null,
    selectedOptionId: string | null,
    version?: number
  ) => void;
  onAskAI?: (questionNumber: string) => void;
  // Optional controlled props for answer reveal
  showAnswer?: boolean;
  onToggleAnswer?: () => void;
}

export function QuestionCard({
  question,
  examId,
  savedAnswer,
  onAnswerChange,
  onAskAI,
  showAnswer: controlledShowAnswer,
  onToggleAnswer,
}: QuestionCardProps) {
  // Support both controlled and uncontrolled modes for backward compatibility
  const [localShowAnswer, setLocalShowAnswer] = useState(false);
  const isControlled = controlledShowAnswer !== undefined;
  const showAnswer = isControlled ? controlledShowAnswer : localShowAnswer;

  const handleToggleAnswer = () => {
    if (onToggleAnswer) {
      onToggleAnswer();
    } else {
      setLocalShowAnswer(!localShowAnswer);
    }
  };

  // Local state for text inputs - initialized from savedAnswer on mount
  // Key prop on parent ensures this remounts when question changes
  const [localTextAnswer, setLocalTextAnswer] = useState(savedAnswer?.answerText ?? "");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track latest text value for debounced save to always use current value
  const latestTextRef = useRef(savedAnswer?.answerText ?? "");
  // Track save version to handle race conditions
  const saveVersionRef = useRef(0);
  // Keep latest callback ref to avoid stale closures
  const onAnswerChangeRef = useRef(onAnswerChange);
  useEffect(() => {
    onAnswerChangeRef.current = onAnswerChange;
  }, [onAnswerChange]);

  const displayOptionId = savedAnswer?.selectedOptionId ?? "";

  // Handle text input change with debounced save
  const handleTextChange = (value: string) => {
    setLocalTextAnswer(value);
    latestTextRef.current = value;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveVersionRef.current += 1;
      const currentVersion = saveVersionRef.current;
      // Use refs to always get latest values, avoiding stale closures
      onAnswerChangeRef.current?.(latestTextRef.current || null, null, currentVersion);
      debounceTimerRef.current = null;
    }, 1000);
  };

  // Handle MCQ option change (immediate save)
  const handleOptionChange = (optionId: string) => {
    onAnswerChange?.(null, optionId);
  };

  // Check if answer key is available for reveal (expectedAnswer is used for all question types)
  const hasAnswerKey = Boolean(question.expectedAnswer);

  // Check if user has submitted an answer
  const hasUserAnswer = Boolean(localTextAnswer || savedAnswer?.selectedOptionId);

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
            {hasAnswerKey && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleToggleAnswer}
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

        {/* Question text */}
        <LatexText
          text={question.questionText}
          className="text-base leading-relaxed block"
        />

        {/* Answer input based on type */}
        <div className="pt-2">
          {question.questionType === "mcq" && (
            <McqQuestion
              questionId={question.id}
              options={question.options}
              value={displayOptionId}
              onChange={handleOptionChange}
            />
          )}
          {question.questionType === "fill_blank" && (
            <FillBlankQuestion
              questionId={question.id}
              value={localTextAnswer}
              onChange={handleTextChange}
            />
          )}
          {question.questionType === "short_answer" && (
            <ShortAnswerQuestion
              questionId={question.id}
              value={localTextAnswer}
              onChange={handleTextChange}
            />
          )}
          {question.questionType === "long_answer" && (
            <LongAnswerQuestion
              questionId={question.id}
              value={localTextAnswer}
              onChange={handleTextChange}
            />
          )}
        </div>

        {/* Grade button and feedback */}
        {examId && hasUserAnswer && (
          <div className="pt-2 border-t space-y-2">
            <GradeButton
              examId={examId}
              questionId={question.id}
              hasAnswer={hasUserAnswer}
              gradingStatus={savedAnswer?.gradingStatus ?? null}
            />
            {savedAnswer && savedAnswer.gradingStatus && savedAnswer.gradingStatus !== "pending" && (
              <GradeFeedback
                isCorrect={savedAnswer.isCorrect}
                score={savedAnswer.score}
                maxScore={savedAnswer.maxScore}
                feedback={savedAnswer.feedback}
                gradingStatus={savedAnswer.gradingStatus}
              />
            )}
          </div>
        )}

        {/* Answer reveal */}
        {showAnswer && <AnswerReveal question={question} />}
      </CardContent>
    </Card>
  );
}
