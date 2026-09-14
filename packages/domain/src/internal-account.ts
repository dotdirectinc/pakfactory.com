/**
 * Internal staff account (PROD-2415, widened by PROD-2512 / ADR-0016).
 *
 * `role` is the admin / RFQ module's own vocabulary (ADR-0016 D4 — each module
 * owns its roles; spec-registry permissions live in registry grants, not here):
 *
 *   sales — a Zoho CRM sales member; sees the requests assigned to them.
 *   staff — internal, with no RFQ scope (e.g. the content team). Admitted to the
 *           admin shell; request views are empty for them by construction.
 */
export type InternalRole = "sales" | "staff";

export const INTERNAL_ROLES: readonly InternalRole[] = ["sales", "staff"];

export function isInternalRole(value: unknown): value is InternalRole {
  return typeof value === "string" && (INTERNAL_ROLES as readonly string[]).includes(value);
}

export type InternalAccount = {
  role: InternalRole;
  /**
   * `internal_user.crm_owner_id`. Null for anyone not mapped to a Zoho sales
   * member — every `staff` account, and a `sales` account not yet mapped. Request
   * reads scope on it, so null means "no requests", never "all requests".
   */
  zohoUserId: string | null;
};
