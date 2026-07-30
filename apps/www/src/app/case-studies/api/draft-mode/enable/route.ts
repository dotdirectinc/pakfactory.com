// NOTE: this route deliberately lives under `/case-studies` (not `/api`). Production
// serves the www app only via the apex, where nginx forwards `/case-studies*` to the
// Vercel origin but NOT `/api/*` (that hits Magento → 404). Sanity Presentation calls
// this to turn on draft mode, so it must sit on an apex-reachable path. PROD-2223.
import { defineEnableDraftMode } from "next-sanity/draft-mode";
import { createClient } from "next-sanity";
import {
  getSanityApiVersion,
  getSanityDataset,
  getSanityProjectId,
} from "@/lib/sanity/env";

const token = process.env["SANITY_API_READ_TOKEN"];

export const { GET } = defineEnableDraftMode({
  client: createClient({
    projectId: getSanityProjectId(),
    dataset: getSanityDataset(),
    apiVersion: getSanityApiVersion(),
    useCdn: false,
    token,
  }).withConfig({ token }),
});
