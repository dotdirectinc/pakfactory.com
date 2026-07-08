import { isAllowedEmbedUrl } from "@pakfactory/sanity/embed-allowlist";
import { CAPTION_CLASS } from "@/lib/blog-caption";
import { fetchBlogGlobalSettings } from "@/lib/blog-global-settings";
import type { PostBodyEmbed } from "@/lib/blog-post";

type BodyEmbedProps = {
  value: PostBodyEmbed;
};

/**
 * Inline iframe embed authored in the post body. Security boundary: the URL is
 * only rendered when it passes the allowlist (baseline hosts ∪ admin-managed
 * Settings.additionalEmbedHosts). Anything else renders nothing.
 */
export async function BodyEmbed({ value }: BodyEmbedProps) {
  const url = value.url?.trim();
  if (!url) return null;

  const settings = await fetchBlogGlobalSettings();
  const additionalHosts = settings?.additionalEmbedHosts ?? [];
  if (!isAllowedEmbedUrl(url, additionalHosts)) return null;

  const title = value.title?.trim() || "Embedded content";
  const caption = value.caption?.trim();
  const isAspect = value.sizing === "aspect";
  const aspectRatio = value.aspectRatio || "16/9";
  const height = value.height && value.height > 0 ? value.height : 600;

  const frameStyle = isAspect ? { aspectRatio } : { height };

  return (
    <figure className="my-8">
      <div
        className="w-full overflow-hidden rounded-lg border border-border bg-muted/20"
        style={frameStyle}
      >
        <iframe
          src={url}
          title={title}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
          allowFullScreen
          className="size-full border-0"
        />
      </div>
      {caption ? (
        <figcaption className={CAPTION_CLASS}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}
