/**
 * Video-embed helpers for the bodyVideo widget (PROD-1910).
 *
 * Supported platforms (player tier): YouTube, Vimeo, Dailymotion, TikTok.
 * `parseVideoUrl` is pure; `fetchPlatformThumbnail` does a cached server-side
 * oEmbed lookup (keyless) for platforms without a predictable thumbnail URL.
 */

export type VideoProvider = "youtube" | "vimeo" | "dailymotion" | "tiktok";

export type ParsedVideo = {
  provider: VideoProvider;
  id: string;
  /** Autoplay embed src for the click-to-play iframe. */
  embedSrc: string;
  /** Player aspect ratio — TikTok is portrait, the rest are landscape. */
  aspect: "16/9" | "9/16";
};

function landscape(provider: VideoProvider, id: string, embedSrc: string): ParsedVideo {
  return { provider, id, embedSrc, aspect: "16/9" };
}

/** Resolve a supported video URL to its provider, id, and autoplay embed src. */
export function parseVideoUrl(rawUrl: string): ParsedVideo | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");

  // YouTube
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    if (id) return landscape("youtube", id, `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`);
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const id =
      u.searchParams.get("v") ??
      u.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1] ??
      null;
    if (id) return landscape("youtube", id, `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`);
  }

  // Vimeo
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean).find((seg) => /^\d+$/.test(seg));
    if (id) return landscape("vimeo", id, `https://player.vimeo.com/video/${id}?autoplay=1`);
  }
  if (host === "player.vimeo.com") {
    const id = u.pathname.match(/\/video\/(\d+)/)?.[1];
    if (id) return landscape("vimeo", id, `https://player.vimeo.com/video/${id}?autoplay=1`);
  }

  // Dailymotion
  if (host === "dailymotion.com") {
    const id = u.pathname.match(/^\/video\/([^/_?]+)/)?.[1];
    if (id) return landscape("dailymotion", id, `https://geo.dailymotion.com/player.html?video=${id}&autoplay=1`);
  }
  if (host === "dai.ly") {
    const id = u.pathname.slice(1);
    if (id) return landscape("dailymotion", id, `https://geo.dailymotion.com/player.html?video=${id}&autoplay=1`);
  }

  // TikTok (full canonical URLs with a numeric video id; portrait)
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const id = u.pathname.match(/\/video\/(\d+)/)?.[1];
    if (id) {
      return {
        provider: "tiktok",
        id,
        embedSrc: `https://www.tiktok.com/player/v1/${id}?autoplay=1`,
        aspect: "9/16",
      };
    }
  }

  return null;
}

type OEmbedResponse = { thumbnail_url?: string };

/**
 * Best-effort platform thumbnail. YouTube has a predictable URL; the others use
 * their keyless oEmbed endpoint. Cached for a day; returns null on any failure
 * so the caller can fall back to a placeholder.
 */
export async function fetchPlatformThumbnail(
  parsed: ParsedVideo,
  rawUrl: string,
): Promise<string | null> {
  if (parsed.provider === "youtube") {
    return `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`;
  }

  const endpoint =
    parsed.provider === "vimeo"
      ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(rawUrl)}`
      : parsed.provider === "dailymotion"
        ? `https://www.dailymotion.com/services/oembed?format=json&url=${encodeURIComponent(rawUrl)}`
        : parsed.provider === "tiktok"
          ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(rawUrl)}`
          : null;
  if (!endpoint) return null;

  try {
    const res = await fetch(endpoint, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as OEmbedResponse;
    return data.thumbnail_url?.trim() || null;
  } catch {
    return null;
  }
}
