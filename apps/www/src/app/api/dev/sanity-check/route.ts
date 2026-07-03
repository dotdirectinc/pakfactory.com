import { NextResponse } from "next/server";
import { getSanityClient } from "@/lib/sanity/client";
import {
  getSanityDataset,
  getSanityProjectId,
  isSanityConfigured,
} from "@/lib/sanity/env";

function maskProjectId(id: string): string {
  if (id.length <= 2) return "(short)";
  return `${id[0]}…${id[id.length - 1]} (${id.length} chars)`;
}

/**
 * Development-only diagnostics (no secrets). Returns 404 outside `development`.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  if (!isSanityConfigured()) {
    return NextResponse.json({
      configured: false,
      projectIdMasked: null,
      dataset: null,
      productPageCount: null,
    });
  }

  const projectId = getSanityProjectId();
  const dataset = getSanityDataset();

  try {
    const client = await getSanityClient();
    const productPageCount = await client.fetch<number>(
      /* groq */ `count(*[_type == "productPage"])`,
    );
    return NextResponse.json({
      configured: true,
      projectIdMasked: maskProjectId(projectId),
      dataset,
      productPageCount,
    });
  } catch (err) {
    return NextResponse.json({
      configured: true,
      projectIdMasked: maskProjectId(projectId),
      dataset,
      productPageCount: null,
      error:
        err instanceof Error ? err.message : typeof err === "string" ? err : "fetch failed",
    });
  }
}
