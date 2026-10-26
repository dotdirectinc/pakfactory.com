/**
 * Server-side Algolia client for admin BFF (ADR-018).
 * Never expose ops-capable keys to the browser.
 */

import { algoliasearch, type Algoliasearch } from "algoliasearch";

function readEnv(key: string): string {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

/** App id shared with blog; write key stays server-only. */
export function getAlgoliaAppId(): string {
  return readEnv("ALGOLIA_APP_ID") || readEnv("NEXT_PUBLIC_ALGOLIA_APP_ID");
}

/**
 * Search-only key. Never the write key: this client serves admin request
 * handlers, so a leak through it must not be able to change or delete
 * indices. With no search key set, search reports itself unconfigured and
 * returns empty results. The write key is for `scripts/algolia-*` only.
 */
export function getAlgoliaServerSearchKey(): string {
  return readEnv("ALGOLIA_SEARCH_KEY") || readEnv("NEXT_PUBLIC_ALGOLIA_API_KEY");
}

export function isAlgoliaSearchConfigured(): boolean {
  return Boolean(getAlgoliaAppId() && getAlgoliaServerSearchKey());
}

let client: Algoliasearch | null = null;

export function getAlgoliaSearchClient(): Algoliasearch | null {
  if (!isAlgoliaSearchConfigured()) return null;
  if (!client) {
    client = algoliasearch(getAlgoliaAppId(), getAlgoliaServerSearchKey());
  }
  return client;
}
