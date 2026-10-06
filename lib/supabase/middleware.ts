import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { protectedPaths, authPaths } from "@/lib/constants";

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request,
	});

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet, headers) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value)
					);
					supabaseResponse = NextResponse.next({
						request,
					});
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options)
					);
					Object.entries(headers).forEach(([key, value]) =>
						supabaseResponse.headers.set(key, value)
					);
				},
			},
		}
	);

	// Do not run code between createServerClient and getClaims(): it is the
	// call that refreshes an expired token and writes the new cookies.
	const { data } = await supabase.auth.getClaims();
	const userId = data?.claims?.sub;

	// A redirect is a new response, so it has to carry over the refreshed
	// cookies; otherwise the browser keeps a token the server already rotated.
	const redirect = (url: URL) => {
		const redirectResponse = NextResponse.redirect(url);
		supabaseResponse.cookies
			.getAll()
			.forEach((cookie) => redirectResponse.cookies.set(cookie));
		for (const header of ["cache-control", "expires", "pragma"]) {
			const value = supabaseResponse.headers.get(header);
			if (value) redirectResponse.headers.set(header, value);
		}
		return redirectResponse;
	};

	const url = new URL(request.url);
	const next = url.searchParams.get("next");
	if (userId) {
		if (authPaths.includes(url.pathname)) {
			return redirect(new URL("/", request.url));
		}
		return supabaseResponse;
	} else {
		if (protectedPaths.includes(url.pathname)) {
			return redirect(
				new URL("/signin?next=" + (next || url.pathname), request.url)
			);
		}
		return supabaseResponse;
	}
}
