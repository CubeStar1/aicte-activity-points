import { LOCAL_MODE } from "@/lib/local/mode";
import { readLocalUpload } from "@/lib/local/store";

// Serves images uploaded in local mode, standing in for Azure blob URLs.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const file = LOCAL_MODE ? readLocalUpload((await params).name) : null;
  if (!file) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      // Uploads are written once under a random name and never changed.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
