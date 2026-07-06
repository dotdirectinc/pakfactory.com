import { sanityImageUrl } from "@/lib/sanity-image";
import type { PostBodyVideo } from "@/lib/blog-post";
import { VideoPlayer } from "./video-player";

/** Resolve a YouTube/Vimeo URL to an autoplay embed src, or null if unsupported. */
function parseEmbedSrc(rawUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1` : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const id =
      u.searchParams.get("v") ??
      u.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1] ??
      null;
    return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1` : null;
  }
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id && /^\d+$/.test(id)
      ? `https://player.vimeo.com/video/${id}?autoplay=1`
      : null;
  }
  if (host === "player.vimeo.com") {
    const id = u.pathname.match(/\/video\/(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null;
  }
  return null;
}

/** YouTube thumbnail fallback when no poster image is set. */
function youtubeThumbnail(rawUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1);
  else if (host.endsWith("youtube.com"))
    id =
      u.searchParams.get("v") ??
      u.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1] ??
      null;
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

/**
 * Inline video embed authored in the post body portable text. Server component:
 * resolves the poster URL (server-only image builder) and hands the interactive
 * click-to-play behaviour to the client VideoPlayer.
 */
export function BodyVideo({ value }: { value: PostBodyVideo }) {
  const url = value.url?.trim();
  if (!url) return null;
  const embedSrc = parseEmbedSrc(url);
  if (!embedSrc) return null;

  const posterUrl =
    sanityImageUrl(value.poster, 1200) ?? youtubeThumbnail(url) ?? undefined;
  const caption = value.caption?.trim();
  const title = value.title?.trim() || "Video";

  return (
    <figure className="my-8">
      <VideoPlayer embedSrc={embedSrc} posterUrl={posterUrl} title={title} />
      {caption ? (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
