import type { Request } from "@pakfactory/domain/request";
import { getRequestReadAdapter } from "@/lib/adapters";
import { requireInternalUser } from "@/lib/auth/require-internal-user";

/**
 * 🔴 THE gate for reading one customer file. One implementation, two callers.
 *
 * The backend's `/api/request/attachments/resolve` authorises the SERVICE, not
 * the person: HMAC proves this BFF is the caller and nothing more. It trusts us
 * to have already established that the signed-in rep may see this request. That
 * split only holds if this side actually does the check — otherwise a leaked
 * SERVICE_SHARED_SECRET reads every customer's artwork.
 *
 * Two steps, and the second is the load-bearing one:
 *
 *   1. `requireInternalUser` — a session, and an enabled internal account.
 *   2. `getById(rfqId, zohoUserId)` — the SAME RLS path the detail page uses.
 *      `rfq_select_assigned_internal` runs in the database under the caller's own
 *      JWT, so not-yours and not-real are one answer: null. A second, hand-written
 *      rule here would be a second place for the boundary to drift.
 *
 * Then the attachment must belong to the request we just authorised. The backend
 * requires the pair to agree too, so an id harvested from another request
 * resolves to nothing either way — doing it here means a mismatched pair never
 * becomes a signed outbound call at all.
 */
export type AttachmentAuthorization =
  | { ok: true; request: Request }
  | { ok: false };

export async function authorizeAttachment(
  rfqId: string,
  attachmentId: string,
): Promise<AttachmentAuthorization> {
  if (!rfqId || !attachmentId) return { ok: false };

  const { account } = await requireInternalUser(`/requests/${rfqId}`);

  const request = await getRequestReadAdapter().getById(rfqId, account.zohoUserId);
  if (!request) return { ok: false };

  if (!request.attachments.some((a) => a.id === attachmentId)) return { ok: false };

  return { ok: true, request };
}
