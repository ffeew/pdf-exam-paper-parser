import { NextRequest } from "next/server";
import { handleAskStream } from "./controller";

export async function POST(request: NextRequest) {
	return handleAskStream(request);
}
