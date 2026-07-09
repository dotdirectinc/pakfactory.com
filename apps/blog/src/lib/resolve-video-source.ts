import { parseVideoUrl } from "@/lib/video-embed";

/** Resolved video source for cards and VideoObject JSON-LD. */
export type ResolvedVideoSource = {
  _id?: string;
  title: string;
  description?: string;
  publishedAt?: string;
  duration?: string;
  href: string;
  thumbnailUrl?: string;
  contentUrl: string;
  embedUrl?: string;
  /** Autoplay iframe URL for dialog playback. */
  embedSrc?: string;
  /** Drives dialog vs new-tab fallback. */
  playbackKind: "iframe" | "hosted" | "linkOnly";
  /** Player aspect ratio for iframe tier. */
  aspect?: "16/9" | "9/16";
  platform?: string;
};

export type VideoPostInput = {
  _id?: string;
  title?: string | null;
  description?: string | null;
  publishedAt?: string | null;
  duration?: string | null;
  sourceType?: "external" | "hosted" | null;
  platform?: string | null;
  externalUrl?: string | null;
  videoFileUrl?: string | null;
  thumbnail?: unknown;
};

type ThumbnailResolver = (thumbnail: unknown) => string | undefined;

function embedUrlWithoutAutoplay(embedSrc: string): string {
  const url = new URL(embedSrc);
  url.searchParams.delete("autoplay");
  const normalized = url.toString();
  return normalized.replace(/([?&])autoplay=true&?/, "$1").replace(/[?&]$/, "");
}

/** Convert display duration "4:32" or "1:04:32" to ISO 8601 PT duration. */
export function displayDurationToIso8601(value: string | null | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const parts = value.trim().split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return undefined;

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = parts[0] ?? 0;
    minutes = parts[1] ?? 0;
    seconds = parts[2] ?? 0;
  } else if (parts.length === 2) {
    minutes = parts[0] ?? 0;
    seconds = parts[1] ?? 0;
  } else if (parts.length === 1) {
    seconds = parts[0] ?? 0;
  } else {
    return undefined;
  }

  const segments: string[] = [];
  if (hours > 0) segments.push(`${hours}H`);
  if (minutes > 0) segments.push(`${minutes}M`);
  if (seconds > 0 || segments.length === 0) segments.push(`${seconds}S`);
  return `PT${segments.join("")}`;
}

export function resolveVideoSource(
  video: VideoPostInput,
  resolveThumbnail: ThumbnailResolver,
): ResolvedVideoSource | null {
  const title = video.title?.trim();
  if (!title) return null;

  const sourceType = video.sourceType ?? "external";

  if (sourceType === "hosted") {
    const contentUrl = video.videoFileUrl?.trim();
    if (!contentUrl) return null;
    const thumbnailUrl = resolveThumbnail(video.thumbnail);
    return {
      _id: video._id,
      title,
      description: video.description?.trim() || undefined,
      publishedAt: video.publishedAt ?? undefined,
      duration: video.duration?.trim() || undefined,
      href: contentUrl,
      thumbnailUrl,
      contentUrl,
      playbackKind: "hosted",
      platform: "hosted",
    };
  }

  const externalUrl = video.externalUrl?.trim();
  if (!externalUrl) return null;

  const platform = video.platform ?? "other";
  let thumbnailUrl = resolveThumbnail(video.thumbnail);
  const parsed = parseVideoUrl(externalUrl);

  if (parsed?.kind === "iframe") {
    if (parsed.provider === "youtube" && !thumbnailUrl) {
      thumbnailUrl = `https://img.youtube.com/vi/${parsed.id}/hqdefault.jpg`;
    }

    return {
      _id: video._id,
      title,
      description: video.description?.trim() || undefined,
      publishedAt: video.publishedAt ?? undefined,
      duration: video.duration?.trim() || undefined,
      href: externalUrl,
      thumbnailUrl,
      contentUrl: externalUrl,
      embedUrl: embedUrlWithoutAutoplay(parsed.embedSrc),
      embedSrc: parsed.embedSrc,
      playbackKind: "iframe",
      aspect: parsed.aspect,
      platform: parsed.provider,
    };
  }

  return {
    _id: video._id,
    title,
    description: video.description?.trim() || undefined,
    publishedAt: video.publishedAt ?? undefined,
    duration: video.duration?.trim() || undefined,
    href: externalUrl,
    thumbnailUrl,
    contentUrl: externalUrl,
    playbackKind: "linkOnly",
    platform,
  };
}

/** Whether a resolved video has the fields required for VideoObject JSON-LD. */
export function isVideoJsonLdReady(
  source: ResolvedVideoSource,
): source is ResolvedVideoSource & {
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
} {
  return Boolean(
    source.description &&
      source.publishedAt &&
      source.thumbnailUrl &&
      (source.contentUrl || source.embedUrl),
  );
}
