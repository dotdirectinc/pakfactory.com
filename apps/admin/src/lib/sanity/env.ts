/**
 * Next.js + Sanity for admin content search fallback (ADR-018).
 * Getters so values resolve after monorepo env load.
 */
function readEnv(key: string): string {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

export function getSanityProjectId(): string {
  return (
    readEnv("NEXT_PUBLIC_SANITY_PROJECT_ID") ||
    readEnv("SANITY_STUDIO_PROJECT_ID") ||
    ""
  );
}

export function getSanityDataset(): string {
  return (
    readEnv("NEXT_PUBLIC_SANITY_DATASET") ||
    readEnv("SANITY_STUDIO_DATASET") ||
    "development"
  );
}

export function getSanityApiVersion(): string {
  return readEnv("NEXT_PUBLIC_SANITY_API_VERSION") || "2025-01-01";
}

export function isSanityConfigured(): boolean {
  return Boolean(getSanityProjectId());
}
