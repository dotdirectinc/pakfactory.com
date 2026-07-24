import { NextResponse } from "next/server";
import { compositeWatermark } from "@/lib/watermark-compose";
import { getSanityProjectId } from "@/lib/sanity/env";

export const runtime = "nodejs";

const MAX_WIDTH = 2400;
const FETCH_TIMEOUT_MS = 15_000;

function isAllowedSanityImageUrl(raw: string, projectId: string): boolean {
  try {
    const url = new URL(raw);
    if (url.hostname !== "cdn.sanity.io") return false;
    // /images/{projectId}/{dataset}/...
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] === "images" && parts[1] === projectId;
  } catch {
    return false;
  }
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "image/*,*/*" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      throw new Error(`Upstream ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Bake-on-serve watermark (PROD-2206 trial).
 * Query: src, wm (Sanity CDN URLs), w, q, o, square=1
 */
export async function GET(request: Request) {
  const projectId = getSanityProjectId();
  if (!projectId) {
    return NextResponse.json(
      { error: "Sanity project not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const src = searchParams.get("src")?.trim();
  const wm = searchParams.get("wm")?.trim();
  const wRaw = Number(searchParams.get("w") ?? "1200");
  const qRaw = Number(searchParams.get("q") ?? "80");
  const oRaw = Number(searchParams.get("o") ?? "0.85");
  const square = searchParams.get("square") === "1";
  const cover16x9 = !square && searchParams.get("cover") === "1";

  if (!src || !wm) {
    return NextResponse.json(
      { error: "Missing src or wm" },
      { status: 400 },
    );
  }
  if (!isAllowedSanityImageUrl(src, projectId) || !isAllowedSanityImageUrl(wm, projectId)) {
    return NextResponse.json(
      { error: "URL not allowlisted" },
      { status: 400 },
    );
  }

  const width = Number.isFinite(wRaw)
    ? Math.min(MAX_WIDTH, Math.max(1, Math.round(wRaw)))
    : 1200;
  const quality = Number.isFinite(qRaw)
    ? Math.min(100, Math.max(1, Math.round(qRaw)))
    : 80;
  const opacity = Number.isFinite(oRaw) ? Math.min(1, Math.max(0, oRaw)) : 0.85;

  try {
    // Ask Sanity for a pre-sized source to limit Sharp input size.
    const sizedSrc = new URL(src);
    sizedSrc.searchParams.set("w", String(width));
    sizedSrc.searchParams.set("q", String(quality));
    sizedSrc.searchParams.set("auto", "format");
    if (square) {
      sizedSrc.searchParams.set("fit", "crop");
      sizedSrc.searchParams.set("h", String(width));
    } else if (cover16x9) {
      const h = Math.max(1, Math.round((width * 9) / 16));
      sizedSrc.searchParams.set("fit", "crop");
      sizedSrc.searchParams.set("h", String(h));
    } else {
      sizedSrc.searchParams.set("fit", "max");
    }

    const [imageBuffer, watermarkBuffer] = await Promise.all([
      fetchBuffer(sizedSrc.toString()),
      fetchBuffer(wm),
    ]);

    const { buffer, contentType } = await compositeWatermark({
      imageBuffer,
      watermarkBuffer,
      width,
      quality,
      opacity,
      square,
      cover16x9,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        "X-Watermark-Mode": "serve",
      },
    });
  } catch (err) {
    console.error("[api/wm] composite failed", err);
    return NextResponse.json(
      { error: "Watermark composite failed" },
      { status: 502 },
    );
  }
}
