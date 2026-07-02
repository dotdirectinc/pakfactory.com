import { createClient, type SanityClient } from "next-sanity";
import { draftMode } from "next/headers";
import imageUrlBuilder from "@sanity/image-url";
import {
  getSanityApiVersion,
  getSanityDataset,
  getSanityProjectId,
} from "./env";

type UrlForSource = Parameters<
  ReturnType<typeof imageUrlBuilder>["image"]
>[0];

let publishedClient: SanityClient | null = null;
let draftsClient: SanityClient | null = null;

function readToken(): string | undefined {
  const t = process.env["SANITY_API_READ_TOKEN"];
  return typeof t === "string" ? t.trim() || undefined : undefined;
}

function createSanityClient(perspective: "drafts" | "published"): SanityClient {
  const studioUrl =
    process.env.NEXT_PUBLIC_SANITY_STUDIO_URL ||
    process.env.SANITY_STUDIO_URL ||
    "http://localhost:3333";
  return createClient({
    projectId: getSanityProjectId(),
    dataset: getSanityDataset(),
    apiVersion: getSanityApiVersion(),
    useCdn: perspective === "published",
    perspective,
    token: readToken(),
    stega: {
      enabled: perspective === "drafts",
      studioUrl,
    },
  });
}

/**
 * Server client for www. Switches to the `drafts` perspective when Next.js
 * draft mode is enabled (set by Sanity Presentation via /api/draft-mode/enable).
 *
 * @see https://www.sanity.io/docs/nextjs/configure-sanity-client-nextjs
 */
export function getPublishedSanityClient(): SanityClient {
  if (!getSanityProjectId()) {
    throw new Error(
      "Sanity is not configured. Set NEXT_PUBLIC_SANITY_PROJECT_ID (recommended) or SANITY_STUDIO_PROJECT_ID in repo root .env.local, then restart the dev server.",
    );
  }
  if (!publishedClient) publishedClient = createSanityClient("published");
  return publishedClient;
}

export async function getSanityClient(): Promise<SanityClient> {
  if (!getSanityProjectId()) {
    throw new Error(
      "Sanity is not configured. Set NEXT_PUBLIC_SANITY_PROJECT_ID (recommended) or SANITY_STUDIO_PROJECT_ID in repo root .env.local, then restart the dev server.",
    );
  }
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
  if (!publishedClient) publishedClient = createSanityClient("published");
  return publishedClient;
}

export function urlFor(source: UrlForSource) {
  const projectId = getSanityProjectId();
  if (!projectId) {
    throw new Error(
      "Sanity project id missing. Set NEXT_PUBLIC_SANITY_PROJECT_ID in .env.local.",
    );
  }
  return imageUrlBuilder({
    projectId,
    dataset: getSanityDataset(),
  }).image(source);
}
