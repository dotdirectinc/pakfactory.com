"use server";

import { createHmac } from "node:crypto";
import { getRequestReadAdapter } from "@/lib/adapters";
import { requireInternalUser } from "@/lib/auth/require-internal-user";

/**
 * Mint a short-lived download URL for one attachment.
 *
 * ── Why the authorisation happens HERE, twice ───────────────────────────────
 * The backend's `/api/request/attachments/resolve` authorises the SERVICE, not
 * the person: HMAC proves this BFF is the caller and nothing more. It trusts us
 * to have already established that the signed-in rep may see this request. That
 * is a deliberate split, and it only holds if this side actually does the check —
 * otherwise a leaked SERVICE_SHARED_SECRET reads every customer's artwork.
 *
 * So before signing anything:
 *   1. `requireInternalUser` — a session, and an enabled internal account.
 *   2. `getById(rfqId, zohoUserId)` — the SAME RLS path the detail page uses.
 *      Not yours (or not real) returns null, and null refuses.
 *
 * Step 2 is the load-bearing one, and it deliberately reuses the existing adapter
 * rather than re-implementing the rule: `rfq_select_assigned_internal` runs in the
 * database under the caller's own JWT. A second, hand-written check here would be
 * a second place for the boundary to drift.
 *
 * ── Why the attachment id is not enough on its own ──────────────────────────
 * The backend requires the rfq id and the attachment id to agree on the same row,
 * so an id harvested from another request resolves to nothing. Belt and braces:
 * we authorise the RFQ, it verifies the pair.
 */

const ENDPOINT_PATH = "/api/request/attachments/resolve";

export type ResolveAttachmentResult =
  | { ok: true; url: string; filename: string; expiresInSeconds: number }
  | { ok: false; error: string };

const GENERIC_ERROR = "That file could not be opened. Please try again.";

export async function resolveAttachmentUrl(
  rfqId: string,
  attachmentId: string,
  disposition: "attachment" | "inline" = "attachment",
): Promise<ResolveAttachmentResult> {
  if (!rfqId || !attachmentId) return { ok: false, error: GENERIC_ERROR };

  const { account } = await requireInternalUser(`/requests/${rfqId}`);

  // 🔴 The gate. Same adapter, same RLS, same null-means-refuse semantics as the
  // page itself — a rep who cannot open the request cannot open its files.
  const request = await getRequestReadAdapter().getById(rfqId, account.zohoUserId);
  if (!request) return { ok: false, error: GENERIC_ERROR };

  // Belt and braces: the attachment must belong to the request we just authorised.
  // The backend checks this too; doing it here means a mismatched pair never
  // becomes a signed outbound call at all.
  if (!request.attachments.some((a) => a.id === attachmentId)) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const baseUrl = process.env.BACKEND_API_BASE_URL;
  const secret = process.env.SERVICE_SHARED_SECRET;
  if (!baseUrl || !secret) {
    // Our misconfiguration, not the rep's mistake — say so in the log, not on screen.
    console.error(
      "[resolveAttachmentUrl] BACKEND_API_BASE_URL / SERVICE_SHARED_SECRET missing.",
    );
    return { ok: false, error: GENERIC_ERROR };
  }

  // The signature covers the EXACT bytes sent, so the body is serialised once and
  // that same string is both signed and posted (ADR-0001 D3).
  const body = JSON.stringify({ rfqId, attachmentId, disposition });
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");

  let res: Response;
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, "")}${ENDPOINT_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pf-timestamp": ts,
        "x-pf-signature": sig,
      },
      body,
      cache: "no-store",
    });
  } catch (err) {
    console.error("[resolveAttachmentUrl] backend unreachable", err);
    return { ok: false, error: GENERIC_ERROR };
  }

  if (!res.ok) {
    // 404 here means the pair disagreed or the row is gone. It is not a
    // distinguishable case for the rep, and saying "not found" would confirm
    // which of the two ids was wrong.
    console.error(`[resolveAttachmentUrl] backend returned ${res.status}`);
    return { ok: false, error: GENERIC_ERROR };
  }

  const payload = (await res.json()) as {
    url?: string;
    filename?: string;
    expiresInSeconds?: number;
  };
  if (!payload.url) return { ok: false, error: GENERIC_ERROR };

  return {
    ok: true,
    url: payload.url,
    filename: payload.filename ?? "download",
    expiresInSeconds: payload.expiresInSeconds ?? 300,
  };
}
