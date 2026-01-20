import { NextRequest } from "next/server";
import { handleGetChatHistory, handleClearChat } from "./controller";

export async function GET(request: NextRequest) {
	return handleGetChatHistory(request);
}

export async function DELETE(request: NextRequest) {
	return handleClearChat(request);
}
