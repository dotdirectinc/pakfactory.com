/**
 * Next.js + Sanity: use NEXT_PUBLIC_* for project id and dataset (Sanity docs).
 * Optional SANITY_STUDIO_* fallbacks so one repo-root `.env.local` can match Studio naming.
 *
 * Use **getters** (functions) so values are read at call time after `loadMonorepoEnv()` —
 * module-level `const` would freeze empty if `env.ts` loaded before `process.env` was set.
 *
 * Bracket `process.env[key]` avoids compile-time inlining of empty `NEXT_PUBLIC_*` values.
 *
 * @see https://www.sanity.io/docs/nextjs/configure-sanity-client-nextjs
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
    "production"
  );
}

export function getSanityApiVersion(): string {
  return readEnv("NEXT_PUBLIC_SANITY_API_VERSION") || "2025-01-01";
}

export function isSanityConfigured(): boolean {
  return Boolean(getSanityProjectId());
}
