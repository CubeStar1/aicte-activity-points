import { nanoid } from "nanoid";
import { createSupabaseServer } from "@/lib/supabase/server";
import { evidenceContainer } from "@/lib/azure-storage";
import { UPLOAD_EXTENSIONS, validateUpload } from "@/lib/upload-limits";
import { completeUpload, redeemTicket, releaseTicket } from "@/lib/mcp/uploads";

// Two kinds of caller: the web form (cookie session) and agents, which send a
// one-time ticket from the MCP `request_upload` tool as `?ticket=`.
export async function POST(request: Request) {
  const ticket = new URL(request.url).searchParams.get("ticket");

  let userId: string;
  let uploadId: string | undefined;

  if (ticket) {
    const redeemed = await redeemTicket(ticket);
    if (!redeemed) {
      return Response.json(
        {
          error:
            "This upload URL is invalid, expired or already used. Call request_upload for a new one.",
        },
        { status: 401 }
      );
    }
    userId = redeemed.userId;
    uploadId = redeemed.id;
  } else {
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
    userId = user.id;
  }

  // A ticket that didn't produce a stored file stays usable for a retry.
  const fail = async (error: string, status: number) => {
    if (uploadId) await releaseTicket(uploadId);
    return Response.json({ error }, { status });
  };

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return fail("Invalid upload.", 400);
  }

  if (!(file instanceof File)) {
    return fail("No file provided.", 400);
  }

  const invalid = validateUpload(file);
  if (invalid) {
    return fail(invalid, 400);
  }

  const blob = evidenceContainer().getBlockBlobClient(
    `${userId}/${nanoid()}.${UPLOAD_EXTENSIONS[file.type]}`
  );

  try {
    await blob.uploadData(Buffer.from(await file.arrayBuffer()), {
      blobHTTPHeaders: { blobContentType: file.type },
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return fail("Storage is unavailable. Please try again.", 502);
  }

  if (uploadId) {
    await completeUpload(uploadId, blob.url);
    return Response.json({ upload_id: uploadId });
  }

  return Response.json({ url: blob.url });
}
