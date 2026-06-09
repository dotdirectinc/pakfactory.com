import { createClient, type SanityClient } from "next-sanity";
import {
  getSanityApiVersion,
  getSanityDataset,
  getSanityProjectId,
} from "./env";

let prodClient: SanityClient | null = null;
let draftPreviewClient: SanityClient | null = null;

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

function createSanityClient(perspectiveOverride?: "drafts" | "published"): SanityClient {
  const token = readToken();
  const isProd = process.env.NODE_ENV === "production";
  const useDraftsInDev = !isProd && Boolean(token);
  const perspective = perspectiveOverride ?? (useDraftsInDev ? "drafts" : "published");
  return createClient({
    projectId: getSanityProjectId(),
    dataset: getSanityDataset(),
    apiVersion: getSanityApiVersion(),
    useCdn: isProd && perspective === "published",
    perspective,
    token,
    // stega only encodes under the drafts perspective; harmless when published.
    stega: { enabled: perspective === "drafts", studioUrl: studioUrl() },
  });
}

export function getSanityClient(): SanityClient {
  if (!getSanityProjectId()) {
    throw new Error(
      "Sanity is not configured. Set NEXT_PUBLIC_SANITY_PROJECT_ID (recommended) or SANITY_STUDIO_PROJECT_ID in repo root .env.local, then restart the dev server.",
    );
  }
  if (process.env.NODE_ENV !== "production") {
    return createSanityClient();
  }
  if (!prodClient) {
    prodClient = createSanityClient();
  }
  return prodClient;
}

/**
 * Draft-mode-aware client for live preview (Sanity Presentation).
 *
 * When Next.js draft mode is enabled (via /api/draft-mode/enable, which the
 * Studio's Presentation tool calls), this returns a `drafts`-perspective client
 * with stega encoding so visual-editing overlays map rendered text back to the
 * Studio field. Otherwise it falls back to the normal published client.
 *
 * Used by the post fetch so the canonical post page is previewable; other
 * callers keep using the synchronous getSanityClient().
 */
export async function getPreviewableSanityClient(): Promise<SanityClient> {
  if (!getSanityProjectId()) {
    throw new Error(
      "Sanity is not configured. Set NEXT_PUBLIC_SANITY_PROJECT_ID (recommended) or SANITY_STUDIO_PROJECT_ID in repo root .env.local, then restart the dev server.",
    );
  }
  // Lazily import next/headers so this module stays importable from client
  // components (a top-level `next/headers` import would break the build).
  const { draftMode } = await import("next/headers");
  const isDraft = (await draftMode()).isEnabled;
  if (isDraft) {
    if (!readToken()) {
      throw new Error(
        "Draft mode is enabled but SANITY_API_READ_TOKEN is missing.",
      );
    }
    if (!draftPreviewClient) draftPreviewClient = createSanityClient("drafts");
    return draftPreviewClient;
  }
  return getSanityClient();
}
