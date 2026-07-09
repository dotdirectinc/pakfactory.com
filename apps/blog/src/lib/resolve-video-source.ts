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

function parseYouTubeId(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1).split("/")[0] || undefined;
    }
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2] || undefined;
      }
      return parsed.searchParams.get("v") ?? undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function parseVimeoId(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("vimeo.com")) return undefined;
    const segments = parsed.pathname.split("/").filter(Boolean);
    const id = segments[segments.length - 1];
    return id && /^\d+$/.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
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
      platform: "hosted",
    };
  }

  const externalUrl = video.externalUrl?.trim();
  if (!externalUrl) return null;

  const platform = video.platform ?? "other";
  let embedUrl: string | undefined;
  let thumbnailUrl = resolveThumbnail(video.thumbnail);

  if (platform === "youtube") {
    const id = parseYouTubeId(externalUrl);
    if (id) {
      embedUrl = `https://www.youtube.com/embed/${id}`;
      thumbnailUrl = thumbnailUrl ?? `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
  } else if (platform === "vimeo") {
    const id = parseVimeoId(externalUrl);
    if (id) {
      embedUrl = `https://player.vimeo.com/video/${id}`;
    }
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
    embedUrl,
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
