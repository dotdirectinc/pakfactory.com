import { defineEnableDraftMode } from "next-sanity/draft-mode";
import { createClient } from "next-sanity";
import {
  getSanityApiVersion,
  getSanityDataset,
  getSanityProjectId,
  isSanityConfigured,
} from "@/lib/sanity/env";

const token = process.env["SANITY_API_READ_TOKEN"];

// Sanity Presentation calls this to turn on Next.js draft mode, then renders the
// blog inside the Studio's preview iframe with live visual-editing overlays.
//
// Guard: when Sanity isn't configured (e.g. `next build` in CI with no env),
// don't build a client at module scope — `createClient` throws on an empty
// projectId and fails the whole build. Draft mode is a Studio-preview feature
// that requires env anyway, so it degrades to unavailable rather than crashing.
export const { GET } = isSanityConfigured()
  ? defineEnableDraftMode({
      client: createClient({
        projectId: getSanityProjectId(),
        dataset: getSanityDataset(),
        apiVersion: getSanityApiVersion(),
        useCdn: false,
        token,
      }).withConfig({ token }),
    })
  : {
      GET: async () =>
        new Response("Draft mode unavailable — Sanity is not configured.", {
          status: 404,
        }),
    };
