"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExamWithQuestions } from "@/app/api/exams/[id]/validator";

interface ExamHeaderProps {
  exam: ExamWithQuestions;
}

export function ExamHeader({ exam }: ExamHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {exam.subject || "Exam"} - {exam.grade || "Unknown Grade"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {exam.schoolName && (
            <div>
              <p className="text-muted-foreground">School</p>
              <p className="font-medium">{exam.schoolName}</p>
            </div>
          )}
          {exam.subject && (
            <div>
              <p className="text-muted-foreground">Subject</p>
              <p className="font-medium">{exam.subject}</p>
            </div>
          )}
          {exam.grade && (
            <div>
              <p className="text-muted-foreground">Grade</p>
              <p className="font-medium">{exam.grade}</p>
            </div>
          )}
          {exam.totalMarks && (
            <div>
              <p className="text-muted-foreground">Total Marks</p>
              <p className="font-medium">{exam.totalMarks}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Questions</p>
            <p className="font-medium">{exam.questions.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">File</p>
            <p className="font-medium truncate" title={exam.filename}>
              {exam.filename}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
