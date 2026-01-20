import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export interface AuthenticatedUser {
	id: string;
	email: string;
	name?: string | null;
}

interface AuthResult {
	user: AuthenticatedUser;
}

interface AuthError {
	error: NextResponse<{ error: string }>;
}

type RequireAuthResult = AuthResult | AuthError;

function isAuthError(result: RequireAuthResult): result is AuthError {
	return "error" in result;
}

/**
 * Verifies that the request has a valid authenticated session.
 * Returns the authenticated user or an error response.
 *
 * Usage:
 * ```ts
 * const authResult = await requireAuth();
 * if ("error" in authResult) return authResult.error;
 * const { user } = authResult;
 * ```
 */
export async function requireAuth(): Promise<RequireAuthResult> {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session?.user) {
		return {
			error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
		};
	}

	return {
		user: {
			id: session.user.id,
			email: session.user.email,
			name: session.user.name,
		},
	};
}

export { isAuthError };
