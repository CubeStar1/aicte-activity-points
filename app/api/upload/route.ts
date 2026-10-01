import { nanoid } from "nanoid";
import { createSupabaseServer } from "@/lib/supabase/server";
import { evidenceContainer } from "@/lib/azure-storage";
import { UPLOAD_EXTENSIONS, validateUpload } from "@/lib/upload-limits";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "You are logged out. Please log in again." },
      { status: 401 }
    );
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return Response.json({ error: "Invalid upload." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }

  const invalid = validateUpload(file);
  if (invalid) {
    return Response.json({ error: invalid }, { status: 400 });
  }

  const blob = evidenceContainer().getBlockBlobClient(
    `${user.id}/${nanoid()}.${UPLOAD_EXTENSIONS[file.type]}`
  );

  try {
    await blob.uploadData(Buffer.from(await file.arrayBuffer()), {
      blobHTTPHeaders: { blobContentType: file.type },
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return Response.json(
      { error: "Storage is unavailable. Please try again." },
      { status: 502 }
    );
  }

  return Response.json({ url: blob.url });
}
