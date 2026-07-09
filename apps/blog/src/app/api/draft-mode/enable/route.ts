import { NextResponse } from "next/server";
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
// Guard: when Sanity is not configured (e.g. CI without env vars), return 503
// instead of crashing at module initialization with an empty projectId.
export async function GET(request: Request): Promise<Response> {
  if (!isSanityConfigured()) {
    return NextResponse.json({ error: "Sanity is not configured." }, { status: 503 });
  }
  const { GET: handler } = defineEnableDraftMode({
    client: createClient({
      projectId: getSanityProjectId(),
      dataset: getSanityDataset(),
      apiVersion: getSanityApiVersion(),
      useCdn: false,
      token,
    }).withConfig({ token }),
  });
  return handler(request);
}
