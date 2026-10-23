/**
 * The one email domain that may hold an admin session (decided 2026-10-23,
 * restoring the 2026-09-04 rule that PROD-2512 had dropped).
 *
 * Admin access needs BOTH this domain AND an enabled `internal_user` row:
 *
 *   DOMAIN     — the www app shares the same Supabase auth (ADR-0016 D1), so any
 *                customer's Google or password account can reach the admin
 *                sign-in paths. The domain keeps a mis-provisioned row (a
 *                customer address typed into internal_user) from admitting a
 *                non-employee.
 *   MEMBERSHIP — the row is what a person is provisioned with. A colleague at
 *                the right domain without one is still refused.
 *
 * Used in four places that must agree: the `hd` hint on the Google authorize
 * request, `/auth/callback`, `signInInternal`, and `requireInternalUser` (so a
 * session established before this rule is refused on its next request).
 *
 * Also encoded in the database: `handle_new_user` skips this domain so a staff
 * sign-in never creates a customer row (server migration
 * 20260904214159_no_customer_row_for_staff). Changing it here means changing it
 * there too.
 */
export const INTERNAL_EMAIL_DOMAIN = "dotdirect.ca";

/** True only for `<local>@dotdirect.ca`, compared case-insensitively. */
export function isInternalEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase() ?? "";
  const at = normalized.lastIndexOf("@");
  return at > 0 && normalized.slice(at + 1) === INTERNAL_EMAIL_DOMAIN;
}
