import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  MAX_TOKENS_PER_USER,
  createToken,
  listTokens,
  revokeToken,
} from "@/lib/mcp/tokens";

const loggedOut = () =>
  Response.json(
    { error: "You are logged out. Please log in again." },
    { status: 401 }
  );

async function currentUserId() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return loggedOut();

  return Response.json({ tokens: await listTokens(userId) });
}

const createSchema = z.object({ name: z.string().trim().min(1).max(60) });

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return loggedOut();

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Give the token a name." }, { status: 400 });
  }

  if ((await listTokens(userId)).length >= MAX_TOKENS_PER_USER) {
    return Response.json(
      {
        error: `You can have at most ${MAX_TOKENS_PER_USER} tokens. Revoke one first.`,
      },
      { status: 400 }
    );
  }

  const { token, info } = await createToken(userId, parsed.data.name);
  return Response.json({ token, info });
}

export async function DELETE(request: Request) {
  const userId = await currentUserId();
  if (!userId) return loggedOut();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing token id." }, { status: 400 });

  await revokeToken(userId, id);
  return Response.json({ ok: true });
}
