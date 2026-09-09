"use server";

import { authorizeAttachment } from "@/lib/attachments/authorize";
import { resolveFromBackend } from "@/lib/attachments/backend-resolve";

/**
 * Mint a short-lived DOWNLOAD url for one attachment.
 *
 * Authorisation is `authorizeAttachment`; the signed call is
 * `resolveFromBackend`. Both are shared with the preview route handler
 * (`/api/attachments/…`) so the two paths cannot drift on either the gate or the
 * signature.
 *
 * Inline VIEWING does not come through here — a server action returns a url to
 * JavaScript, and putting that url in the DOM is what ADR-0013 D3 rules out. The
 * route handler exists for exactly that reason.
 */
export type ResolveAttachmentResult =
  | { ok: true; url: string; filename: string; expiresInSeconds: number }
  | { ok: false; error: string; reason: string };

/**
 * One message for every failure, deliberately. Distinguishing "no such
 * attachment" from "not on that RFQ" would confirm to a caller holding half a
 * valid pair that the other half is real.
 *
 * `reason` rides alongside for OUR diagnosis — it is a coarse machine token, not
 * copy, and it is what was missing on 2026-09-08 when seven distinct causes all
 * arrived at the browser as this one sentence.
 */
const GENERIC_ERROR = "That file could not be opened. Please try again.";

export async function resolveAttachmentUrl(
  rfqId: string,
  attachmentId: string,
): Promise<ResolveAttachmentResult> {
  const auth = await authorizeAttachment(rfqId, attachmentId);
  if (!auth.ok) return { ok: false, error: GENERIC_ERROR, reason: "forbidden" };

  const resolved = await resolveFromBackend(rfqId, attachmentId, "attachment");
  if (!resolved.ok) {
    return { ok: false, error: GENERIC_ERROR, reason: resolved.reason };
  }

  return {
    ok: true,
    url: resolved.url,
    filename: resolved.filename,
    expiresInSeconds: resolved.expiresInSeconds,
  };
}
