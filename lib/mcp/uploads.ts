import { randomBytes } from "node:crypto";
import { nanoid } from "nanoid";
import supabaseAdmin from "@/lib/supabase/admin";
import { LOCAL_MODE, LOCAL_USER_ID } from "@/lib/local/mode";
import { findLocalUpload, isUploadId } from "@/lib/local/store";
import { sha256 } from "./tokens";

/**
 * One-time upload tickets. An agent can't send a file through an MCP tool
 * call, so it asks for a ticket and POSTs the file to /api/upload with it.
 *
 * Local mode keeps no ticket records: the ticket is the upload id, and it
 * counts as used once a file is stored under that id. Tickets don't expire.
 */

const TICKET_TTL_MINUTES = 15;

export async function createUploadTickets(userId: string, count: number) {
  const expiresAt = new Date(Date.now() + TICKET_TTL_MINUTES * 60_000);
  const tickets = Array.from({ length: count }, () => ({
    id: nanoid(),
    ticket: randomBytes(24).toString("base64url"),
  }));

  if (LOCAL_MODE) {
    return {
      tickets: tickets.map(({ id }) => ({ id, ticket: id })),
      expiresInMinutes: TICKET_TTL_MINUTES,
    };
  }

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
  if (LOCAL_MODE) {
    return isUploadId(ticket) && !findLocalUpload(ticket)
      ? { id: ticket, userId: LOCAL_USER_ID }
      : null;
  }

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
  if (LOCAL_MODE) return;

  const { error } = await supabaseAdmin()
    .from("mcp_uploads")
    .update({ url })
    .eq("id", id);

  if (error) throw new Error(`Failed to record upload: ${error.message}`);
}

/** Makes a ticket usable again after its upload was rejected or failed. */
export async function releaseTicket(id: string) {
  if (LOCAL_MODE) return;

  await supabaseAdmin().from("mcp_uploads").update({ used_at: null }).eq("id", id);
}

/** The stored file's URL, or null if this user has no finished upload with that id. */
export async function getUploadedUrl(userId: string, uploadId: string) {
  if (LOCAL_MODE) return findLocalUpload(uploadId);

  const { data, error } = await supabaseAdmin()
    .from("mcp_uploads")
    .select("url")
    .eq("id", uploadId)
    .eq("user_id", userId)
    .maybeSingle<{ url: string | null }>();

  if (error) throw new Error(`Failed to look up upload: ${error.message}`);
  return data?.url ?? null;
}
