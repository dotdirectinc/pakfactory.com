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

  // Facebook has no keyless thumbnail — with no editor poster, render its native
  // embed directly (its own thumbnail shows from the start) instead of a blank
  // placeholder. Strip autoplay so it doesn't play on load.
  const autoShow = parsed.provider === "facebook" && !posterUrl;
  const embedSrc = autoShow
    ? parsed.embedSrc.replace("&autoplay=true", "")
    : parsed.embedSrc;

  return (
    <figure className="my-8">
      <VideoPlayer
        embedSrc={embedSrc}
        posterUrl={posterUrl}
        title={title}
        aspect={parsed.aspect}
        autoShow={autoShow}
      />
      {caption ? (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
