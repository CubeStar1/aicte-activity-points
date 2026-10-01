import supabaseAdmin from "@/lib/supabase/admin";
import type { FormFillerData } from "@/lib/types/form-filler";
import {
  summarizeStudent,
  type ActivityFormRow,
  type AuthUserLite,
  type StudentSummary,
} from "@/lib/admin/student-summary.mjs";

/**
 * Server-side reads of every student's form. These bypass RLS via the service
 * role key, so only call them behind `checkAdmin()`.
 */

const AUTH_PAGE_SIZE = 1000;

async function fetchAuthUsers(): Promise<Map<string, AuthUserLite>> {
  const supabase = supabaseAdmin();
  const users = new Map<string, AuthUserLite>();

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    });

    if (error) throw new Error(`Failed to list auth users: ${error.message}`);

    for (const user of data.users) {
      users.set(user.id, {
        id: user.id,
        email: user.email,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
      });
    }

    if (data.users.length < AUTH_PAGE_SIZE) break;
  }

  return users;
}

export interface StudentListResult {
  students: StudentSummary[];
  /** Auth accounts with no `activity_forms` row yet. */
  usersWithoutForms: AuthUserLite[];
  /** Raw form payloads keyed by user id, so callers avoid a second round trip. */
  forms: Map<string, FormFillerData | null>;
}

export async function fetchAllStudents(): Promise<StudentListResult> {
  const supabase = supabaseAdmin();

  const [{ data: rows, error }, authUsers] = await Promise.all([
    supabase
      .from("activity_forms")
      .select("id, user_id, form_data, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .returns<ActivityFormRow[]>(),
    fetchAuthUsers(),
  ]);

  if (error) throw new Error(`Failed to load activity forms: ${error.message}`);

  const forms = rows ?? [];
  const withForms = new Set(forms.map((row) => row.user_id));

  return {
    students: forms.map((row) => summarizeStudent(row, authUsers.get(row.user_id))),
    usersWithoutForms: Array.from(authUsers.values()).filter(
      (user) => !withForms.has(user.id)
    ),
    forms: new Map(forms.map((row) => [row.user_id, row.form_data])),
  };
}

export interface StudentDetail {
  summary: StudentSummary;
  formData: FormFillerData | null;
  row: ActivityFormRow;
}

export async function fetchStudent(userId: string): Promise<StudentDetail | null> {
  const supabase = supabaseAdmin();

  const { data: row, error } = await supabase
    .from("activity_forms")
    .select("id, user_id, form_data, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle<ActivityFormRow>();

  if (error) throw new Error(`Failed to load form for ${userId}: ${error.message}`);
  if (!row) return null;

  const { data } = await supabase.auth.admin.getUserById(userId);
  const authUser = data?.user
    ? {
        id: data.user.id,
        email: data.user.email,
        last_sign_in_at: data.user.last_sign_in_at,
        email_confirmed_at: data.user.email_confirmed_at,
      }
    : null;

  return {
    summary: summarizeStudent(row, authUser),
    formData: row.form_data,
    row,
  };
}
