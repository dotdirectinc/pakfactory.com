import type { InternalAccountAdapter } from "@pakfactory/domain/adapters/internal-account";

/**
 * PROD-2415: read internal role + zohoUserId from Supabase (never user_metadata).
 * Wire up when the internal account table and RLS land.
 */
export function createSupabaseInternalAccountAdapter(): InternalAccountAdapter {
  return {
    async getByEmail(_email: string) {
      throw new Error(
        "Supabase internal account adapter is not implemented — complete PROD-2415 and set ADMIN_DATA_SOURCE=mock until ready.",
      );
    },
  };
}
