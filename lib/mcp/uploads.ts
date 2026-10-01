import { randomBytes } from "node:crypto";
import { nanoid } from "nanoid";
import supabaseAdmin from "@/lib/supabase/admin";
import { sha256 } from "./tokens";

/**
 * One-time upload tickets. An agent can't send a file through an MCP tool
 * call, so it asks for a ticket and POSTs the file to /api/upload with it.
 */

const TICKET_TTL_MINUTES = 15;

export async function createUploadTickets(userId: string, count: number) {
  const expiresAt = new Date(Date.now() + TICKET_TTL_MINUTES * 60_000);
  const tickets = Array.from({ length: count }, () => ({
    id: nanoid(),
    ticket: randomBytes(24).toString("base64url"),
  }));

  const { error } = await supabaseAdmin()
    .from("mcp_uploads")
    .insert(
      tickets.map(({ id, ticket }) => ({
        id,
        user_id: userId,
        ticket_hash: sha256(ticket),
        expires_at: expiresAt.toISOString(),
      }))
    );

  if (error) throw new Error(`Failed to create upload tickets: ${error.message}`);
  return { tickets, expiresInMinutes: TICKET_TTL_MINUTES };
}

/** Claims an unused, unexpired ticket. Returns null if there is none to claim. */
export async function redeemTicket(ticket: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin()
    .from("mcp_uploads")
    .update({ used_at: now })
    .eq("ticket_hash", sha256(ticket))
    .is("used_at", null)
    .gt("expires_at", now)
    .select("id, user_id")
    .maybeSingle<{ id: string; user_id: string }>();

  if (error) throw new Error(`Failed to redeem ticket: ${error.message}`);
  return data ? { id: data.id, userId: data.user_id } : null;
}

export async function completeUpload(id: string, url: string) {
  const { error } = await supabaseAdmin()
    .from("mcp_uploads")
    .update({ url })
    .eq("id", id);

  if (error) throw new Error(`Failed to record upload: ${error.message}`);
}

/** Makes a ticket usable again after its upload was rejected or failed. */
export async function releaseTicket(id: string) {
  await supabaseAdmin().from("mcp_uploads").update({ used_at: null }).eq("id", id);
}

/** The stored file's URL, or null if this user has no finished upload with that id. */
export async function getUploadedUrl(userId: string, uploadId: string) {
  const { data, error } = await supabaseAdmin()
    .from("mcp_uploads")
    .select("url")
    .eq("id", uploadId)
    .eq("user_id", userId)
    .maybeSingle<{ url: string | null }>();

  if (error) throw new Error(`Failed to look up upload: ${error.message}`);
  return data?.url ?? null;
}
