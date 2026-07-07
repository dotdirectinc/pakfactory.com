import { sanityImageUrl } from "@/lib/sanity-image";
import { fetchPlatformThumbnail, parseVideoUrl } from "@/lib/video-embed";
import type { PostBodyVideo } from "@/lib/blog-post";
import { VideoPlayer } from "./video-player";

/**
 * Inline video embed authored in the post body portable text. Supports YouTube,
 * Vimeo, Dailymotion, and TikTok. Server component: resolves the poster
 * (editor upload overrides the platform thumbnail) and hands the interactive
 * click-to-play behaviour to the client VideoPlayer.
 */
export async function BodyVideo({ value }: { value: PostBodyVideo }) {
  const url = value.url?.trim();
  if (!url) return null;
  const parsed = parseVideoUrl(url);
  if (!parsed) return null;

  // Thumbnail priority: editor poster (override) → platform thumbnail → none.
  const customPoster = sanityImageUrl(value.poster, 1200);
  const posterUrl =
    customPoster ?? (await fetchPlatformThumbnail(parsed, url)) ?? undefined;

  const caption = value.caption?.trim();
  const title = value.title?.trim() || "Video";

  return (
    <figure className="my-8">
      <VideoPlayer
        embedSrc={parsed.embedSrc}
        posterUrl={posterUrl}
        title={title}
        aspect={parsed.aspect}
      />
      {caption ? (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
