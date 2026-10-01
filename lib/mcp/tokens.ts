import { createHash, randomBytes } from "node:crypto";
import supabaseAdmin from "@/lib/supabase/admin";

const TOKEN_PREFIX = "aap_";
export const MAX_TOKENS_PER_USER = 5;

export const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export interface McpTokenInfo {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
}

const TOKEN_COLUMNS = "id, name, prefix, created_at, last_used_at";

export async function listTokens(userId: string): Promise<McpTokenInfo[]> {
  const { data, error } = await supabaseAdmin()
    .from("mcp_tokens")
    .select(TOKEN_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<McpTokenInfo[]>();

  if (error) throw new Error(`Failed to list tokens: ${error.message}`);
  return data ?? [];
}

/** Returns the new token. This is the only time it exists in plain text. */
export async function createToken(userId: string, name: string) {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");

  const { data, error } = await supabaseAdmin()
    .from("mcp_tokens")
    .insert({
      user_id: userId,
      name,
      token_hash: sha256(token),
      prefix: token.slice(0, TOKEN_PREFIX.length + 6),
    })
    .select(TOKEN_COLUMNS)
    .single<McpTokenInfo>();

  if (error) throw new Error(`Failed to create token: ${error.message}`);
  return { token, info: data };
}

export async function revokeToken(userId: string, id: string) {
  const { error } = await supabaseAdmin()
    .from("mcp_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) throw new Error(`Failed to revoke token: ${error.message}`);
}

/** Resolves a bearer token to its owner's user id, or null if it isn't valid. */
export async function verifyToken(token: string): Promise<string | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;

  // One round trip: stamping last_used_at doubles as the lookup.
  const { data, error } = await supabaseAdmin()
    .from("mcp_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", sha256(token))
    .select("user_id")
    .maybeSingle<{ user_id: string }>();

  if (error) throw new Error(`Failed to verify token: ${error.message}`);
  return data?.user_id ?? null;
}
