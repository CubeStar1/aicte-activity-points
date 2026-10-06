"use server";

import { createSupabaseServer } from "@/lib/supabase/server";

export const verifyOtp = async (data: {
	email: string;
	otp: string;
	type: string;
}) => {
	const supabase = await createSupabaseServer();

	const res = await supabase.auth.verifyOtp({
		email: data.email,
		token: data.otp,
		type: "email",
	});
	return JSON.stringify(res);
};

export const resetPassword = async (data: {
	email: string;
	otp: string;
	password: string;
}): Promise<{ error: string | null; codeUsed?: boolean }> => {
	const supabase = await createSupabaseServer();

	const verified = await supabase.auth.verifyOtp({
		email: data.email,
		token: data.otp,
		type: "recovery",
	});
	if (verified.error) {
		return { error: "That code is incorrect or has expired." };
	}

	const updated = await supabase.auth.updateUser({ password: data.password });
	if (updated.error) {
		await supabase.auth.signOut();
		return { error: updated.error.message, codeUsed: true };
	}
	return { error: null };
};
