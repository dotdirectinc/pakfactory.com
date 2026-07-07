import { sanityImageUrl } from "@/lib/sanity-image";
import { fetchPlatformThumbnail, parseVideoUrl } from "@/lib/video-embed";
import type { PostBodyVideo } from "@/lib/blog-post";
import { VideoPlayer } from "./video-player";
import { SocialVideoEmbed } from "./social-video-embed";

/**
 * Inline video embed authored in the post body portable text.
 *
 * iframe tier (YouTube, Vimeo, Dailymotion, TikTok, Facebook): server resolves
 * the poster — editor upload overrides the platform thumbnail — and hands
 * click-to-play to the client VideoPlayer. social tier (Twitter/X, Instagram):
 * click-to-load native card via SocialVideoEmbed.
 */
export async function BodyVideo({ value }: { value: PostBodyVideo }) {
  const url = value.url?.trim();
  if (!url) return null;
  const parsed = parseVideoUrl(url);
  if (!parsed) return null;

  const customPoster = sanityImageUrl(value.poster, 1200);
  const caption = value.caption?.trim();
  const title = value.title?.trim() || "Video";

  if (parsed.kind === "social") {
    return (
      <figure className="my-8">
        <SocialVideoEmbed
          provider={parsed.provider}
          url={parsed.url}
          posterUrl={customPoster}
          title={title}
        />
        {caption ? (
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  // iframe tier: editor poster (override) → platform thumbnail → none.
  const posterUrl =
    customPoster ?? (await fetchPlatformThumbnail(parsed, url)) ?? undefined;

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
