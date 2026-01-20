"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LatexText } from "@/components/ui/latex-text";
import { QuestionCard } from "./question-card";
import type { Question } from "@/app/api/exams/[id]/validator";

interface SectionGroupProps {
  sectionName: string | null;
  sectionInstructions: string | null;
  questions: Question[];
}

export function SectionGroup({
  sectionName,
  sectionInstructions,
  questions,
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
              <LatexText
                text={sectionInstructions}
                className="text-sm text-muted-foreground"
              />
            </CardContent>
          )}
        </Card>
      )}

      {/* Questions in this section */}
      {questions.map((question) => (
        <QuestionCard key={question.id} question={question} />
      ))}
    </div>
  );
}
