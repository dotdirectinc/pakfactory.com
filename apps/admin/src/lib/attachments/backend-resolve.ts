import { createHmac } from "node:crypto";

/**
 * The signed call to the backend's attachment resolver, with NO authorisation of
 * its own.
 *
 * 🔴 This module authorises NOBODY. It proves to the backend that this BFF is
 * the caller (HMAC), and the backend trusts us to have already established that
 * the signed-in rep may see this RFQ. Every caller must do that check first —
 * see `authorizeAttachment` in ./authorize.ts, which is the one place that rule
 * lives.
 *
 * It exists as its own module because two callers need it and must not drift:
 * the `resolveAttachment` server action (download, `attachment`) and the
 * `/api/attachments/…` route handler (preview, `inline`). Duplicating the
 * signing was the alternative, and a signature that is subtly different in one
 * of two places fails as a 401 nobody can read.
 */

const ENDPOINT_PATH = "/api/request/attachments/resolve";

export type Disposition = "attachment" | "inline";

export type BackendResolution =
  | { ok: true; url: string; filename: string; expiresInSeconds: number }
  | { ok: false; reason: BackendFailure };

/**
 * Why it failed, in terms a caller can branch on. Deliberately coarse: this is
 * for OUR logs and for choosing a status code, never for a message shown to a
 * rep — "not found" would confirm which of the two ids was wrong.
 */
export type BackendFailure =
  | "not_configured"
  | "unreachable"
  | "unauthorized"
  | "not_found"
  | "backend_error";

/** Maps the backend's status onto the failure vocabulary above. */
function failureFor(status: number): BackendFailure {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 404) return "not_found";
  return "backend_error";
}

export async function resolveFromBackend(
  rfqId: string,
  attachmentId: string,
  disposition: Disposition,
): Promise<BackendResolution> {
  const baseUrl = process.env.BACKEND_API_BASE_URL;
  const secret = process.env.SERVICE_SHARED_SECRET;

  if (!baseUrl || !secret) {
    // Name the one that is actually missing. Reporting both cost a debugging
    // round on 2026-09-08: the log said "BACKEND_API_BASE_URL /
    // SERVICE_SHARED_SECRET missing" while only one of them was.
    const missing = [
      !baseUrl ? "BACKEND_API_BASE_URL" : null,
      !secret ? "SERVICE_SHARED_SECRET" : null,
    ].filter(Boolean);
    console.error(
      `[attachments] ${missing.join(" and ")} ` +
        `${missing.length > 1 ? "are" : "is"} not set; cannot resolve.`,
    );
    return { ok: false, reason: "not_configured" };
  }

  // The signature covers the EXACT bytes sent, so the body is serialised once
  // and that same string is both signed and posted (ADR-0001 D3).
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
    console.error("[attachments] backend unreachable", err);
    return { ok: false, reason: "unreachable" };
  }

  if (!res.ok) {
    // 🔴 The status is the diagnosis, so log it plainly. 401 is a signing or
    // clock failure between two of our own services; 503 is the backend failing
    // to reach S3 or the database — on 2026-09-08 that was the API box having no
    // AWS credentials at all, and a generic message sent us to the wrong layer
    // twice before the box's own log named it.
    console.error(
      `[attachments] backend returned ${res.status} for ${disposition} permit`,
    );
    return { ok: false, reason: failureFor(res.status) };
  }

  const payload = (await res.json()) as {
    url?: string;
    filename?: string;
    expiresInSeconds?: number;
  };

  if (!payload.url) {
    console.error("[attachments] backend returned 200 with no url", payload);
    return { ok: false, reason: "backend_error" };
  }

  return {
    ok: true,
    url: payload.url,
    filename: payload.filename ?? "download",
    expiresInSeconds: payload.expiresInSeconds ?? 300,
  };
}
