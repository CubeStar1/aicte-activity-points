import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Admins are configured by email in `ADMIN_EMAILS` (comma separated). There is
 * no role column in the schema, and this list is read server side only so it is
 * never shipped to the browser.
 *
 * An empty or missing list denies everyone — the dashboard reads every
 * student's data, so it fails closed rather than open.
 */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

export type AdminCheck =
  | { ok: true; email: string; userId: string }
  | { ok: false; reason: "unauthenticated" | "not-configured" | "forbidden" };

export async function checkAdmin(): Promise<AdminCheck> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "unauthenticated" };
  if (getAdminEmails().length === 0) return { ok: false, reason: "not-configured" };
  if (!isAdminEmail(user.email)) return { ok: false, reason: "forbidden" };

  return { ok: true, email: user.email!, userId: user.id };
}
