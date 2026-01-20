import { NextRequest } from "next/server";
import { handleSubmitAnswer, handleGetAnswers } from "./controller";

export async function POST(request: NextRequest) {
  return handleSubmitAnswer(request);
}

export async function GET(request: NextRequest) {
  return handleGetAnswers(request);
}
