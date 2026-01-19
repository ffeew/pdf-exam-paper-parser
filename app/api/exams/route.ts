import { NextRequest } from "next/server";
import { handleListExams } from "./controller";

export async function GET(request: NextRequest) {
  return handleListExams(request);
}
