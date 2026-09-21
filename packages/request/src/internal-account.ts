/** Internal staff account linked to a Zoho CRM sales member (PROD-2415). */

export type InternalRole = "sales";

export type InternalAccount = {
  role: InternalRole;
  zohoUserId: string;
};
