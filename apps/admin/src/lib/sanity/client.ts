import { createClient, type SanityClient } from "next-sanity";
import {
  getSanityApiVersion,
  getSanityDataset,
  getSanityProjectId,
  isSanityConfigured,
} from "./env";

let publishedClient: SanityClient | null = null;

/** Published-perspective client for staff content search (no draft mode). */
export function getAdminSanityClient(): SanityClient | null {
  if (!isSanityConfigured()) return null;
  if (!publishedClient) {
    publishedClient = createClient({
      projectId: getSanityProjectId(),
      dataset: getSanityDataset(),
      apiVersion: getSanityApiVersion(),
      useCdn: true,
      perspective: "published",
    });
  }
  return publishedClient;
}
