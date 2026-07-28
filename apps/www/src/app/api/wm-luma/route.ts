import { NextResponse } from "next/server";
import { sampleCornerLuminanceFromBuffer } from "@/lib/watermark-compose";
import { getSanityProjectId } from "@/lib/sanity/env";
import { WATERMARK_SAMPLE_MAX_PX } from "@pakfactory/components/commons/watermark-variant";

export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 15_000;
/** Fetch a modest CDN size so corner geometry is meaningful. */
const SAMPLE_FETCH_WIDTH = Math.max(256, WATERMARK_SAMPLE_MAX_PX * 4);

function isAllowedSanityImageUrl(raw: string, projectId: string): boolean {
  try {
    const url = new URL(raw);
    if (url.hostname !== "cdn.sanity.io") return false;
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] === "images" && parts[1] === projectId;
  } catch {
    return false;
  }
}

/**
 * Same-origin corner luminance probe for adaptive overlay watermarks.
 * Query: `src` = Sanity CDN photo URL.
 * Returns `{ luminance: number }` (0–1) or an error status.
 */
export async function GET(request: Request) {
  const projectId = getSanityProjectId();
  if (!projectId) {
    return NextResponse.json(
      { error: "Sanity project not configured" },
      { status: 503 },
    );
  }

  const src = new URL(request.url).searchParams.get("src")?.trim();
  if (!src) {
    return NextResponse.json({ error: "Missing src" }, { status: 400 });
  }
  if (!isAllowedSanityImageUrl(src, projectId)) {
    return NextResponse.json(
      { error: "URL not allowlisted" },
      { status: 400 },
    );
  }

  try {
    const sizedSrc = new URL(src);
    sizedSrc.searchParams.set("w", String(SAMPLE_FETCH_WIDTH));
    sizedSrc.searchParams.set("auto", "format");
    sizedSrc.searchParams.set("fit", "max");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let imageBuffer: Buffer;
    try {
      const res = await fetch(sizedSrc.toString(), {
        signal: controller.signal,
        headers: { Accept: "image/*,*/*" },
        next: { revalidate: 86400 },
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `Upstream ${res.status}` },
          { status: 502 },
        );
      }
      imageBuffer = Buffer.from(await res.arrayBuffer());
    } finally {
      clearTimeout(timer);
    }

    const luminance = await sampleCornerLuminanceFromBuffer(imageBuffer);
    if (luminance == null) {
      return NextResponse.json(
        { error: "Luminance sample failed" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { luminance },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    console.error("[api/wm-luma] sample failed", err);
    return NextResponse.json(
      { error: "Luminance sample failed" },
      { status: 502 },
    );
  }
}
