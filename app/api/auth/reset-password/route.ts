import SupaAuthVerifyEmail from "@/emails";
import supabaseAdmin from "@/lib/supabase/admin";

import { Resend } from "resend";
const resend = new Resend(process.env.NEXT_PUBLIC_RESEND_API_KEY);

export async function POST(request: Request) {
	const data = await request.json();
	if (typeof data?.email !== "string" || !data.email) {
		return Response.json({ error: "Email is required" }, { status: 400 });
	}

	const supabase = supabaseAdmin();
	const appName = process.env.NEXT_PUBLIC_APP_NAME!;

	const res = await supabase.auth.admin.generateLink({
		type: "recovery",
		email: data.email,
	});

	if (res.error?.code === "user_not_found") {
		return Response.json(
			{ error: "No account found for this email", code: "user_not_found" },
			{ status: 404 }
		);
	}
	if (res.error) {
		console.error("Reset code could not be generated:", res.error.message);
		return Response.json(
			{ error: "Could not send the email. Please try again." },
			{ status: 500 }
		);
	}

	if (res.data.properties?.email_otp) {
		const resendRes = await resend.emails.send({
			from: `${appName} <onboarding@${process.env.NEXT_PUBLIC_RESEND_DOMAIN}>`,
			to: [data.email],
			subject: `${appName} - Reset Password`,
			react: SupaAuthVerifyEmail({
				verificationCode: res.data.properties.email_otp,
				purpose: "reset",
			}),
		});
		if (resendRes.error) {
			console.error("Reset email failed to send:", resendRes.error.message);
			return Response.json(
				{ error: "Could not send the email. Please try again." },
				{ status: 502 }
			);
		}
	}
	return Response.json({ error: null });
}
