"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useExam } from "@/hooks/use-exam";
import { ExamHeader } from "@/components/exam/exam-header";
import { SectionGroup } from "@/components/exam/section-group";
import { QuestionImage } from "@/components/exam/question-image";
import type { Question, Section } from "@/app/api/exams/[id]/validator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ExamSkeleton() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function ProcessingState() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-lg text-muted-foreground">
            Processing your exam paper...
          </p>
          <p className="text-sm text-muted-foreground">
            This may take a moment. Please wait.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="text-4xl">Error</div>
          <p className="text-lg text-destructive">Failed to process exam</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

interface SectionGroupData {
  sectionName: string | null;
  sectionInstructions: string | null;
  questions: Question[];
}

function groupQuestionsBySection(
  sectionsData: Section[],
  questionsData: Question[]
): SectionGroupData[] {
  // Build a map of sectionId -> Section
  const sectionMap = new Map<string, Section>();
  for (const section of sectionsData) {
    sectionMap.set(section.id, section);
  }

  // Group questions by sectionId
  const questionsBySectionId = new Map<string | null, Question[]>();
  for (const question of questionsData) {
    const key = question.sectionId;
    const existing = questionsBySectionId.get(key) || [];
    existing.push(question);
    questionsBySectionId.set(key, existing);
  }

  const groups: SectionGroupData[] = [];

  // Add sections in order with their questions
  for (const section of sectionsData) {
    const sectionQuestions = questionsBySectionId.get(section.id) || [];
    if (sectionQuestions.length > 0) {
      groups.push({
        sectionName: section.sectionName || null,
        sectionInstructions: section.instructions,
        questions: sectionQuestions,
      });
    }
  }

  // Add questions without a section (sectionId is null)
  const unsectionedQuestions = questionsBySectionId.get(null) || [];
  if (unsectionedQuestions.length > 0) {
    groups.push({
      sectionName: null,
      sectionInstructions: null,
      questions: unsectionedQuestions,
    });
  }

  return groups;
}

export default function ExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } = useSession();
  const { data: exam, isLoading, error } = useExam(id);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isSessionLoading && !session) {
      router.push("/login");
    }
  }, [session, isSessionLoading, router]);

  if (isSessionLoading || isLoading) {
    return <ExamSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load exam</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Exam not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (exam.status === "processing" || exam.status === "pending") {
    return <ProcessingState />;
  }

  if (exam.status === "failed") {
    return <ErrorState message={exam.errorMessage || "Unknown error"} />;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <ExamHeader exam={exam} />

      {/* Exam-level images (not linked to specific questions) */}
      {exam.examImages && exam.examImages.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Exam Reference Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              {exam.examImages.map((img) => (
                <QuestionImage key={img.id} image={img} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-8 mt-8">
        {groupQuestionsBySection(exam.sections, exam.questions).map((group, index) => (
          <SectionGroup
            key={`section-${index}`}
            sectionName={group.sectionName}
            sectionInstructions={group.sectionInstructions}
            questions={group.questions}
          />
        ))}
      </div>

      {exam.questions.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No questions found in this exam.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
