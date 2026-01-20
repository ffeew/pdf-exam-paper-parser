"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useExams } from "@/hooks/use-exams";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FileText, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "processing":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function ExamsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">No exams yet</p>
        <p className="text-sm text-muted-foreground">
          Upload your first exam paper to get started
        </p>
        <Button asChild>
          <Link href="/upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload Exam
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ExamsPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } = useSession();
  const { data, isLoading, error } = useExams();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isSessionLoading && !session) {
      router.push("/login");
    }
  }, [session, isSessionLoading, router]);

  if (isSessionLoading || isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">My Exams</h1>
        <ExamsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">My Exams</h1>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load exams</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const exams = data?.exams || [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Exams</h1>
        <Button asChild size="sm">
          <Link href="/upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Link>
        </Button>
      </div>

      {exams.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {exams.map((exam) => (
            <Link key={exam.id} href={`/exams/${exam.id}`} className="block">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{exam.filename}</h3>
                      <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
                        {exam.subject && <span>{exam.subject}</span>}
                        {exam.grade && (
                          <>
                            {exam.subject && <span>•</span>}
                            <span>{exam.grade}</span>
                          </>
                        )}
                        {exam.schoolName && (
                          <>
                            {(exam.subject || exam.grade) && <span>•</span>}
                            <span>{exam.schoolName}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span>
                          {exam.questionCount}{" "}
                          {exam.questionCount === 1 ? "question" : "questions"}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(exam.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium capitalize",
                        getStatusColor(exam.status)
                      )}
                    >
                      {exam.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
