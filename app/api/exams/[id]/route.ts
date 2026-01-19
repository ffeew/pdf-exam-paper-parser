import { NextRequest } from "next/server";
import { handleGetExam, handleGetExamStatus } from "./controller";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const statusOnly = url.searchParams.get("status") === "true";

  if (statusOnly) {
    return handleGetExamStatus(request, id);
  }

  return handleGetExam(request, id);
}
