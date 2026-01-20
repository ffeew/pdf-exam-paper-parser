"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ViewMode = "structured" | "document";

interface ExamViewToggleProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ExamViewToggle({ view, onViewChange }: ExamViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border bg-muted p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("structured")}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          view === "structured"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Questions
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("document")}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          view === "document"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Document
      </Button>
    </div>
  );
}
