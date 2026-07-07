/**
 * Video-embed helpers for the bodyVideo widget (PROD-1910).
 *
 * Two tiers:
 *  - iframe:  YouTube, Vimeo, Dailymotion, TikTok, Facebook — click-to-play
 *             poster into an iframe.
 *  - social:  Twitter/X, Instagram — no clean iframe; rendered via the
 *             platform's JS SDK (click-to-load), which draws its own card.
 *
 * `parseVideoUrl` is pure. `fetchPlatformThumbnail` does a cached, keyless
 * server-side oEmbed lookup for iframe platforms that lack a predictable
 * thumbnail URL (Facebook/social have no keyless thumbnail — editor poster only).
 */

export type IframeProvider =
  | "youtube"
  | "vimeo"
  | "dailymotion"
  | "tiktok"
  | "facebook";
export type SocialProvider = "twitter" | "instagram";
export type VideoProvider = IframeProvider | SocialProvider;

export type ParsedVideo =
  | {
      kind: "iframe";
      provider: IframeProvider;
      id: string;
      /** Autoplay embed src for the click-to-play iframe. */
      embedSrc: string;
      /** Player aspect ratio — TikTok is portrait, the rest are landscape. */
      aspect: "16/9" | "9/16";
    }
  | {
      kind: "social";
      provider: SocialProvider;
      /** Canonical post/tweet URL for the platform blockquote embed. */
      url: string;
    };

function iframe(
  provider: IframeProvider,
  id: string,
  embedSrc: string,
  aspect: "16/9" | "9/16" = "16/9",
): ParsedVideo {
  return { kind: "iframe", provider, id, embedSrc, aspect };
}

/** Resolve a supported video URL to its provider + embed strategy. */
export function parseVideoUrl(rawUrl: string): ParsedVideo | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");

  // ── YouTube ──────────────────────────────────────────────────────────────
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    if (id) return iframe("youtube", id, `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`);
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const id =
      u.searchParams.get("v") ??
      u.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1] ??
      null;
    if (id) return iframe("youtube", id, `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`);
  }

  // ── Vimeo ────────────────────────────────────────────────────────────────
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean).find((seg) => /^\d+$/.test(seg));
    if (id) return iframe("vimeo", id, `https://player.vimeo.com/video/${id}?autoplay=1`);
  }
  if (host === "player.vimeo.com") {
    const id = u.pathname.match(/\/video\/(\d+)/)?.[1];
    if (id) return iframe("vimeo", id, `https://player.vimeo.com/video/${id}?autoplay=1`);
  }

  // ── Dailymotion ──────────────────────────────────────────────────────────
  if (host === "dailymotion.com") {
    const id = u.pathname.match(/^\/video\/([^/_?]+)/)?.[1];
    if (id) return iframe("dailymotion", id, `https://geo.dailymotion.com/player.html?video=${id}&autoplay=1`);
  }
  if (host === "dai.ly") {
    const id = u.pathname.slice(1);
    if (id) return iframe("dailymotion", id, `https://geo.dailymotion.com/player.html?video=${id}&autoplay=1`);
  }

  // ── TikTok (portrait) ────────────────────────────────────────────────────
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const id = u.pathname.match(/\/video\/(\d+)/)?.[1];
    if (id) return iframe("tiktok", id, `https://www.tiktok.com/player/v1/${id}?autoplay=1`, "9/16");
  }

  // ── Facebook (plugin iframe accepts the full href; token-free) ───────────
  if (host === "facebook.com" || host === "m.facebook.com" || host === "fb.watch" || host === "fb.com") {
    const isReel = /\/reel\//.test(u.pathname);
    const isVideo =
      host === "fb.watch" ||
      isReel ||
      /\/(videos|watch)\b/.test(u.pathname) ||
      u.searchParams.has("v");
    if (isVideo) {
      const src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(rawUrl)}&show_text=false&autoplay=true`;
      // Reels are portrait (9:16); regular FB videos are landscape.
      return iframe("facebook", rawUrl, src, isReel ? "9/16" : "16/9");
    }
  }

  // ── Twitter / X (social embed) ───────────────────────────────────────────
  if (host === "twitter.com" || host === "x.com" || host === "mobile.twitter.com") {
    if (/\/status\/\d+/.test(u.pathname)) {
      // Normalize x.com → twitter.com for widgets.js.
      const normalized = rawUrl.replace(/^https?:\/\/(www\.)?(mobile\.)?x\.com/, "https://twitter.com");
      return { kind: "social", provider: "twitter", url: normalized };
    }
  }

  // ── Instagram (social embed) ─────────────────────────────────────────────
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    if (/^\/(?:p|reel|tv)\/[^/]+/.test(u.pathname)) {
      return { kind: "social", provider: "instagram", url: rawUrl };
    }
  }

  return null;
}

type OEmbedResponse = { thumbnail_url?: string };

/**
 * Best-effort platform thumbnail for the iframe tier. YouTube has a predictable
 * URL; Vimeo/Dailymotion/TikTok use their keyless oEmbed endpoint. Facebook has
 * no keyless thumbnail. Cached for a day; returns null on any failure.
 */
export async function fetchPlatformThumbnail(
  parsed: Extract<ParsedVideo, { kind: "iframe" }>,
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
