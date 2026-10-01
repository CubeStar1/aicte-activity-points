import { LOCAL_MODE } from "@/lib/local/mode";
import { readLocalForm, writeLocalForm } from "@/lib/local/store";

export const dynamic = "force-dynamic";

const notFound = () => new Response(null, { status: 404 });

// The browser's view of the form in local mode, standing in for the Supabase
// `activity_forms` row.
export async function GET() {
  if (!LOCAL_MODE) return notFound();

  const row = readLocalForm();
  return Response.json({
    data: row?.form_data ?? null,
    updatedAt: row?.updated_at ?? null,
  });
}

export async function PUT(request: Request) {
  if (!LOCAL_MODE) return notFound();

  const body = await request.json().catch(() => null);
  if (!body?.formData || typeof body.formData !== "object") {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  const updatedAt = writeLocalForm(body.formData, body.loadedAt);
  if (!updatedAt) return Response.json({ conflict: true }, { status: 409 });

  return Response.json({ updatedAt });
}
