import { createClient, type SanityClient } from "next-sanity";
import {
  getSanityApiVersion,
  getSanityDataset,
  getSanityProjectId,
} from "./env";

let prodClient: SanityClient | null = null;

function readToken(): string | undefined {
  const t = process.env["SANITY_API_READ_TOKEN"];
  return typeof t === "string" ? t.trim() || undefined : undefined;
}

function createSanityClient(): SanityClient {
  const token = readToken();
  const isProd = process.env.NODE_ENV === "production";
  const useDraftsInDev = !isProd && Boolean(token);
  return createClient({
    projectId: getSanityProjectId(),
    dataset: getSanityDataset(),
    apiVersion: getSanityApiVersion(),
    useCdn: isProd,
    perspective: useDraftsInDev ? "drafts" : "published",
    token,
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
