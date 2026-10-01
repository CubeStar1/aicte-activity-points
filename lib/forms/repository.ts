import supabaseAdmin from "@/lib/supabase/admin";
import { FormFillerData } from "@/lib/types/form-filler";
import { emptyFormData, totalPoints } from "./derive";

/**
 * Server-side access to one user's form for callers that have no Supabase
 * session (the MCP server). These bypass RLS via the service role key, so
 * `userId` must come from a verified token, never from request input.
 */

/** A problem the caller can fix; its message is safe to show to the agent. */
export class FormError extends Error {}

const MAX_WRITE_ATTEMPTS = 3;

// Rows saved by older versions of the app can be missing whole sections.
const normalize = (data: Partial<FormFillerData> | null): FormFillerData => {
  const empty = emptyFormData();
  return {
    student: { ...empty.student, ...data?.student },
    activities: (data?.activities ?? []).map((activity) => ({
      ...activity,
      photos: activity.photos ?? [],
    })),
    evaluations: data?.evaluations ?? [],
    signatories: {
      evaluator1: { ...empty.signatories.evaluator1, ...data?.signatories?.evaluator1 },
      evaluator2: { ...empty.signatories.evaluator2, ...data?.signatories?.evaluator2 },
      counsellor: { ...empty.signatories.counsellor, ...data?.signatories?.counsellor },
    },
  };
};

async function readRow(userId: string) {
  const { data: row, error } = await supabaseAdmin()
    .from("activity_forms")
    .select("form_data, updated_at")
    .eq("user_id", userId)
    .maybeSingle<{ form_data: FormFillerData | null; updated_at: string }>();

  if (error) throw new Error(`Failed to load form: ${error.message}`);
  return row;
}

export async function getForm(userId: string): Promise<FormFillerData> {
  return normalize((await readRow(userId))?.form_data ?? null);
}

/**
 * Applies `mutate` to the user's form and saves it. The write only lands if
 * the row is unchanged since it was read, so an edit made in the browser at
 * the same moment is never silently overwritten; on a clash it re-reads and
 * re-applies.
 */
export async function mutateForm<T>(
  userId: string,
  mutate: (form: FormFillerData) => T
): Promise<T> {
  const supabase = supabaseAdmin();

  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const row = await readRow(userId);
    const form = normalize(row?.form_data ?? null);
    const result = mutate(form);

    form.activities.forEach((activity, idx) => {
      activity.slNo = idx + 1;
    });
    form.student.totalPoints = totalPoints(form.activities);

    if (!row) {
      const { error } = await supabase
        .from("activity_forms")
        .insert({ user_id: userId, form_data: form });
      if (!error) return result;
      // 23505: the row was created between our read and insert. Retry as an update.
      if (error.code !== "23505") {
        throw new Error(`Failed to save form: ${error.message}`);
      }
      continue;
    }

    const { data: saved, error } = await supabase
      .from("activity_forms")
      .update({ form_data: form })
      .eq("user_id", userId)
      .eq("updated_at", row.updated_at)
      .select("id");

    if (error) throw new Error(`Failed to save form: ${error.message}`);
    if (saved.length > 0) return result;
  }

  throw new FormError(
    "The form is being edited somewhere else right now. Try again in a moment."
  );
}
