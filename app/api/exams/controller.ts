import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { listExams } from "./service";
import { ListExamsQuerySchema, type ListExamsResponse } from "./validator";

export async function handleListExams(
  request: NextRequest
): Promise<NextResponse<ListExamsResponse | { error: string }>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const { exams, total } = await listExams(session.user.id, queryResult.data);

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
