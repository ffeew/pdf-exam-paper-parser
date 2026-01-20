import { NextRequest } from "next/server";
import { handleGradeExam } from "./controller";

export async function POST(request: NextRequest) {
  return handleGradeExam(request);
}
