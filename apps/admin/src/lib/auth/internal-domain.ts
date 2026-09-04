/**
 * The one domain that may hold an admin account (decided 2026-09-04).
 *
 * Used in two places that must agree: the `hd` hint on the Google authorize
 * request, and the check in `/auth/callback`. If they drift, the UI offers
 * accounts the callback then refuses — which reads as a broken login rather than
 * a policy.
 *
 * Also encoded in the database: `handle_new_user` skips this domain so a staff
 * sign-in never creates a customer row (server migration
 * 20260904214159_no_customer_row_for_staff). Changing it here means changing it
 * there too.
 */
export const INTERNAL_EMAIL_DOMAIN = "dotdirect.ca";
