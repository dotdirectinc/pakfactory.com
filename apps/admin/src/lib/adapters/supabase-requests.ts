import type { RequestReadAdapter } from "@pakfactory/domain/adapters/requests";

/**
 * PROD-2414 / PROD-2415: read requests scoped by sales member via Supabase RLS.
 * Wire up when the requests schema and internal scoping land.
 */
export function createSupabaseRequestReadAdapter(): RequestReadAdapter {
  return {
    async listForSalesMember(_zohoUserId: string) {
      throw new Error(
        "Supabase request read adapter is not implemented — complete PROD-2414/PROD-2415 and set ADMIN_DATA_SOURCE=mock until ready.",
      );
    },
    async getById(_id: string, _zohoUserId: string) {
      throw new Error(
        "Supabase request read adapter is not implemented — complete PROD-2414/PROD-2415 and set ADMIN_DATA_SOURCE=mock until ready.",
      );
    },
  };
}
