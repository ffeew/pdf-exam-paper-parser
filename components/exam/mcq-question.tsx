"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { LatexText } from "@/components/ui/latex-text";

interface McqQuestionProps {
  questionId: string;
  options: Array<{
    id: string;
    optionLabel: string;
    optionText: string;
  }>;
  value?: string;
  onChange?: (optionId: string) => void;
}

export function McqQuestion({
  questionId,
  options,
  value = "",
  onChange,
}: McqQuestionProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(val) => onChange?.(val)}
      className="space-y-3"
    >
      {options.map((option) => (
        <div
          key={option.id}
          className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <RadioGroupItem
            value={option.id}
            id={`${questionId}-${option.id}`}
            className="mt-0.5"
          />
          <Label
            htmlFor={`${questionId}-${option.id}`}
            className="flex-1 cursor-pointer font-normal leading-relaxed"
          >
            <span className="font-semibold mr-2">{option.optionLabel}.</span>
            <LatexText text={option.optionText} preserveWhitespace={false} />
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
