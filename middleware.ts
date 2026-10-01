import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { authPaths } from "@/lib/constants";
import { LOCAL_MODE } from "@/lib/local/mode";

export async function middleware(request: NextRequest) {
	if (LOCAL_MODE) {
		// Nobody to sign in: every page is open, and the auth pages have no use.
		if (authPaths.includes(request.nextUrl.pathname)) {
			return NextResponse.redirect(new URL("/form-filler", request.url));
		}
		return NextResponse.next();
	}

	return await updateSession(request);
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - api/mcp (agents authenticate with a bearer token, not a session)
		 * Feel free to modify this pattern to include more paths.
		 */
		"/((?!api/mcp$|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
