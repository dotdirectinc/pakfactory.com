import type { InternalAccount } from "../internal-account";

export interface InternalAccountAdapter {
  getByEmail(email: string): Promise<InternalAccount | null>;
}

/**
 * Mock internal accounts until PROD-2415 lands the Supabase-backed model.
 * Allowlist format: comma-separated `email:zohoUserId` pairs.
 */
export function createMockInternalAccountAdapter(
  allowlist: string,
): InternalAccountAdapter {
  const entries = new Map<string, InternalAccount>();

  for (const part of allowlist.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [email, zohoUserId] = trimmed.split(":").map((s) => s.trim());
    if (!email || !zohoUserId) continue;
    entries.set(email.toLowerCase(), { role: "sales", zohoUserId });
  }

  return {
    async getByEmail(email: string): Promise<InternalAccount | null> {
      return entries.get(email.trim().toLowerCase()) ?? null;
    },
  };
}
