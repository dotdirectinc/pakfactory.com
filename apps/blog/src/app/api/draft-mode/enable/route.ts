import { defineEnableDraftMode } from "next-sanity/draft-mode";
import { createClient } from "next-sanity";
import {
  getSanityApiVersion,
  getSanityDataset,
  getSanityProjectId,
} from "@/lib/sanity/env";

const token = process.env["SANITY_API_READ_TOKEN"];

// Sanity Presentation calls this to turn on Next.js draft mode, then renders the
// blog inside the Studio's preview iframe with live visual-editing overlays.
export const { GET } = defineEnableDraftMode({
  client: createClient({
    projectId: getSanityProjectId(),
    dataset: getSanityDataset(),
    apiVersion: getSanityApiVersion(),
    useCdn: false,
    token,
  }).withConfig({ token }),
});
