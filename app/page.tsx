"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // If logged in, redirect to upload page
  useEffect(() => {
    if (!isPending && session) {
      router.push("/upload");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">PDF Exam Paper Parser</CardTitle>
          <CardDescription className="text-base">
            Upload PDF exam papers and convert them into interactive web-based
            exams with AI assistance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Features:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>OCR-powered PDF parsing</li>
              <li>Automatic question extraction</li>
              <li>Interactive exam interface</li>
              <li>Support for MCQ, fill-in-the-blank, and essay questions</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <Button asChild size="lg" className="w-full">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/signup">Create Account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
