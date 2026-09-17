// Site-root draft mode, for the whole-site Presentation target (PROD-2494).
//
// Why this exists alongside `case-studies/api/draft-mode/enable`: that one is
// pinned under `/case-studies` because the APEX is served by nginx, which
// forwards `/case-studies*` to this app but sends `/api/*` to Magento (PROD-2223).
// The site-root Presentation target is **staging.pakfactory.com**, a Vercel domain
// serving this app directly with no nginx in front — so `/api/*` is reachable
// there and at `localhost:3000`, but NOT via the apex. Keep both: they serve two
// different origins, and neither path works for the other.
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
