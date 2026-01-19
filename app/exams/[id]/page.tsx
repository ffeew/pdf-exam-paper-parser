"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useExam } from "@/hooks/use-exam";
import { ExamHeader } from "@/components/exam/exam-header";
import { QuestionCard } from "@/components/exam/question-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

function ExamSkeleton() {
  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function ProcessingState() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
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
    <div className="container mx-auto py-8 max-w-4xl">
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
      <div className="container mx-auto py-8 max-w-4xl">
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
      <div className="container mx-auto py-8 max-w-4xl">
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
    <div className="container mx-auto py-8 max-w-4xl">
      <ExamHeader exam={exam} />

      <div className="space-y-6 mt-8">
        {exam.questions.map((question) => (
          <QuestionCard key={question.id} question={question} />
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
