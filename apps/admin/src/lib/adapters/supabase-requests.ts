import type { RequestReadAdapter } from "@pakfactory/domain/adapters/requests";
import type { Request, RequestSummary } from "@pakfactory/domain/request";
import { createClient } from "@pakfactory/supabase/server";
import {
  toRequest,
  toRequestSummary,
  type RfqRow,
  type RfqAttachmentRow,
} from "./rfq-to-domain";

/**
 * PROD-2414 / PROD-2415: requests scoped to the signed-in sales member.
 *
 * 🔴 THE SCOPING IS THE DATABASE'S JOB, NOT THIS FILE'S.
 *
 * `public.rfq` carries the policy `rfq_select_assigned_internal`, which admits a
 * row only when the caller's `internal_user.crm_owner_id` equals the row's
 * `assigned_owner_crm_id`. Using the session-scoped client (anon key + the
 * caller's cookies) means `auth.uid()` is set and that policy runs.
 *
 * A service-role client would bypass RLS and leave a `.eq()` in application code
 * as the only thing between one sales member and another's pipeline — one
 * forgotten filter from a full disclosure. It would also break the acceptance
 * criterion that removing a role revokes access with no deploy, since the
 * revocation would depend on code rather than data.
 *
 * The `zohoUserId` argument is therefore defence in depth, not the control: it
 * should always agree with what RLS already enforces, and a mismatch means the
 * caller resolved a different account than the session holds.
 */

const SUMMARY_COLUMNS =
  "id, reference, contact_email, customer_id, crm_lead_id, payload, submitted_at, created_at, updated_at";

/** `s3_key` is deliberately NOT selected. Nothing above the backend needs it, and
 *  a key that never reaches this process cannot be leaked by it (ADR-0013 D3). */
const ATTACHMENT_COLUMNS = "id, filename, kind, content_type, bytes";

export function createSupabaseRequestReadAdapter(): RequestReadAdapter {
  return {
    async listForSalesMember(zohoUserId: string): Promise<RequestSummary[]> {
      if (!zohoUserId) return [];

      const supabase = await createClient();
      const { data, error } = await supabase
        .from("rfq")
        .select(SUMMARY_COLUMNS)
        .eq("assigned_owner_crm_id", zohoUserId)
        .order("submitted_at", { ascending: false });

      if (error) throw new Error(`request list failed: ${error.message}`);
      return (data as RfqRow[] | null)?.map(toRequestSummary) ?? [];
    },

    async getById(id: string, zohoUserId: string): Promise<Request | null> {
      if (!id || !zohoUserId) return null;

      const supabase = await createClient();
      const { data, error } = await supabase
        .from("rfq")
        .select(SUMMARY_COLUMNS)
        .eq("id", id)
        .eq("assigned_owner_crm_id", zohoUserId)
        .maybeSingle();

      if (error) throw new Error(`request fetch failed: ${error.message}`);

      // Null covers three cases that must be indistinguishable to the caller:
      // the request does not exist, it belongs to another sales member, or RLS
      // hid it. Telling them apart would confirm the existence of records the
      // caller may not see — the "opening another member's URL is refused"
      // criterion, answered by returning nothing rather than by a 403 that
      // reveals the row is real.
      if (!data) return null;

      // Second query, SAME session-scoped client. `rfq_attachment` carries its own
      // policy (rfq_attachment_select_assigned_internal) resolved through the
      // parent RFQ, so RLS enforces the boundary here exactly as it does above —
      // there is no `.eq()` in this file doing the security work.
      //
      // A failure here must NOT fail the page: the request is readable and useful
      // without its file list, and a broken attachment index should degrade to
      // "no files shown", not to a 500 on a request a rep is trying to work.
      const { data: files, error: filesError } = await supabase
        .from("rfq_attachment")
        .select(ATTACHMENT_COLUMNS)
        .eq("rfq_id", id)
        .order("created_at", { ascending: true });

      if (filesError) {
        console.error(
          `[supabase-requests] attachment index unavailable for ${id}: ${filesError.message}`,
        );
      }

      return toRequest(data as RfqRow, (files as RfqAttachmentRow[] | null) ?? null);
    },
  };
}
