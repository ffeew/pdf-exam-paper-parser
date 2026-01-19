"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useUploadExam } from "@/hooks/use-upload";
import { useExamStatus } from "@/hooks/use-exam";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

type UploadStage = "idle" | "uploading" | "processing";

function getStatusMessage(status: string): string {
	switch (status) {
		case "pending":
			return "Waiting to process...";
		case "processing":
			return "Processing your exam paper...";
		case "completed":
			return "Processing complete!";
		case "failed":
			return "Processing failed";
		default:
			return "Unknown status";
	}
}

export default function UploadPage() {
	const [file, setFile] = useState<File | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [stage, setStage] = useState<UploadStage>("idle");
	const [examId, setExamId] = useState<string | null>(null);
	const router = useRouter();
	const { data: session, isPending: isSessionLoading } = useSession();

	const {
		mutate: uploadExam,
		isPending: isUploading,
		error: uploadError,
	} = useUploadExam({
		onProgress: (progress) => {
			setUploadProgress(progress.progress);
		},
	});

	// Poll for exam status when processing
	const { data: examStatus } = useExamStatus(examId || "", {
		enabled: !!examId && stage === "processing",
		refetchInterval: 3000, // Poll every 3 seconds
	});

	// Handle status changes
	useEffect(() => {
		if (examStatus?.status === "completed" && examId) {
			router.push(`/exams/${examId}`);
		}
	}, [examStatus?.status, examId, router]);

	// Redirect to login if not authenticated
	useEffect(() => {
		if (!isSessionLoading && !session) {
			router.push("/login");
		}
	}, [session, isSessionLoading, router]);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const selectedFile = e.target.files?.[0];
			if (selectedFile && selectedFile.type === "application/pdf") {
				setFile(selectedFile);
			} else if (selectedFile) {
				alert("Please select a PDF file");
			}
		},
		[]
	);

	const handleUpload = useCallback(() => {
		if (!file) return;

		setStage("uploading");
		setUploadProgress(0);

		uploadExam(file, {
			onSuccess: (result) => {
				setExamId(result.examId);
				setStage("processing");
			},
			onError: () => {
				setStage("idle");
			},
		});
	}, [file, uploadExam]);

	if (isSessionLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	const isProcessing = stage === "processing";
	const isUploadingStage = stage === "uploading" || isUploading;

	return (
		<div className="p-8 max-w-xl mx-auto">
			<Card>
				<CardHeader>
					<CardTitle>Upload Exam Paper</CardTitle>
					<CardDescription>
						Upload a PDF exam paper to parse it into an interactive exam
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* File Selection */}
					<div className="space-y-2">
						<Label htmlFor="pdf">Select PDF file</Label>
						<Input
							id="pdf"
							type="file"
							accept="application/pdf"
							onChange={handleFileChange}
							disabled={isUploadingStage || isProcessing}
						/>
						{file && (
							<p className="text-sm text-muted-foreground">
								Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}{" "}
								MB)
							</p>
						)}
					</div>

					{/* Upload Progress */}
					{isUploadingStage && (
						<div className="space-y-2">
							<Progress value={uploadProgress} />
							<p className="text-sm text-center text-muted-foreground">
								Uploading... {uploadProgress}%
							</p>
						</div>
					)}

					{/* Processing Status */}
					{isProcessing && examStatus && (
						<div className="space-y-2">
							<Progress value={undefined} className="animate-pulse" />
							<p className="text-sm text-center text-muted-foreground">
								{getStatusMessage(examStatus.status)}
							</p>
							{examStatus.status === "failed" && examStatus.errorMessage && (
								<p className="text-sm text-center text-destructive">
									Error: {examStatus.errorMessage}
								</p>
							)}
						</div>
					)}

					{/* Error Display */}
					{uploadError && (
						<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
							{uploadError.message}
						</div>
					)}

					{/* Upload Button */}
					<Button
						onClick={handleUpload}
						disabled={!file || isUploadingStage || isProcessing}
						className="w-full"
						size="lg"
					>
						{isUploadingStage
							? "Uploading..."
							: isProcessing
							? "Processing..."
							: "Upload & Parse"}
					</Button>

					{/* Help Text */}
					<p className="text-xs text-center text-muted-foreground">
						Supported: PDF files up to 50MB.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
