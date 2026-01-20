import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { listExams } from "./service";
import { ListExamsQuerySchema, type ListExamsResponse } from "./validator";

export async function handleListExams(
  request: NextRequest
): Promise<NextResponse<ListExamsResponse | { error: string }>> {
  try {
    const authResult = await requireAuth();
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const queryResult = ListExamsQuerySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      );
    }

    const { exams, total } = await listExams(user.id, queryResult.data);

    return NextResponse.json({
      exams,
      total,
      limit: queryResult.data.limit,
      offset: queryResult.data.offset,
    });
  } catch (error) {
    console.error("Error listing exams:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
