import { createClient, type SanityClient } from "next-sanity";
import {
  getSanityApiVersion,
  getSanityDataset,
  getSanityProjectId,
} from "./env";

let publishedClient: SanityClient | null = null;
let draftsClient: SanityClient | null = null;

function readToken(): string | undefined {
  const t = process.env["SANITY_API_READ_TOKEN"];
  return typeof t === "string" ? t.trim() || undefined : undefined;
}

/** Studio origin — lets stega-encoded content map overlays back to Studio fields. */
function studioUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SANITY_STUDIO_URL ||
    process.env.SANITY_STUDIO_URL ||
    "http://localhost:3333"
  );
}

function createSanityClient(perspective: "drafts" | "published"): SanityClient {
  const token = readToken();
  const isProd = process.env.NODE_ENV === "production";
  return createClient({
    projectId: getSanityProjectId(),
    dataset: getSanityDataset(),
    apiVersion: getSanityApiVersion(),
    useCdn: isProd && perspective === "published",
    perspective,
    token,
    stega: {
      enabled: perspective === "drafts",
      studioUrl: studioUrl(),
    },
  });
}

/**
 * Published-perspective client for sitemap, RSS, redirects, and settings.
 * Never returns draft content.
 */
export function getPublishedSanityClient(): SanityClient {
  if (!getSanityProjectId()) {
    throw new Error(
      "Sanity is not configured. Set NEXT_PUBLIC_SANITY_PROJECT_ID (recommended) or SANITY_STUDIO_PROJECT_ID in repo root .env.local, then restart the dev server.",
    );
  }
  if (!publishedClient) {
    publishedClient = createSanityClient("published");
  }
  return publishedClient;
}

/**
 * Draft-mode-aware client for page rendering (Sanity Presentation).
 *
 * When Next.js draft mode is enabled (via /api/draft-mode/enable), returns a
 * `drafts`-perspective client with stega. Otherwise returns the published client.
 *
 * Aligns with `apps/www/src/sanity/client.ts`.
 */
export async function getSanityClient(): Promise<SanityClient> {
  if (!getSanityProjectId()) {
    throw new Error(
      "Sanity is not configured. Set NEXT_PUBLIC_SANITY_PROJECT_ID (recommended) or SANITY_STUDIO_PROJECT_ID in repo root .env.local, then restart the dev server.",
    );
  }
  const { draftMode } = await import("next/headers");
  const isDraft = (await draftMode()).isEnabled;
  if (isDraft) {
    if (!readToken()) {
      throw new Error(
        "Draft mode is enabled but SANITY_API_READ_TOKEN is missing.",
      );
    }
    if (!draftsClient) draftsClient = createSanityClient("drafts");
    return draftsClient;
  }
  return getPublishedSanityClient();
}

/** Alias for `getSanityClient()` — same draft-mode-aware behavior. */
export async function getPreviewableSanityClient(): Promise<SanityClient> {
  return getSanityClient();
}
