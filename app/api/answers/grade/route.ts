import { NextRequest } from "next/server";
import { handleGradeAnswer } from "./controller";

export async function POST(request: NextRequest) {
  return handleGradeAnswer(request);
}
