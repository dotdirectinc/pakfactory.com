import { isAllowedEmbedUrl } from "@pakfactory/sanity/embed-allowlist";
import { CAPTION_CLASS } from "@/lib/blog-caption";
import { fetchBlogGlobalSettings } from "@/lib/blog-global-settings";
import type { PostBodyEmbed } from "@/lib/blog-post";
import { EmbedFrame } from "./embed-frame";

type BodyEmbedProps = {
  value: PostBodyEmbed;
};

/**
 * Inline iframe embed authored in the post body. Security boundary: the URL is
 * only rendered when it passes the allowlist (baseline hosts ∪ admin-managed
 * Settings.additionalEmbedHosts). Sizing (fixed / auto / aspect) is handled by
 * the client EmbedFrame.
 */
export async function BodyEmbed({ value }: BodyEmbedProps) {
  const url = value.url?.trim();
  if (!url) return null;

  const settings = await fetchBlogGlobalSettings();
  const additionalHosts = settings?.additionalEmbedHosts ?? [];
  if (!isAllowedEmbedUrl(url, additionalHosts)) return null;

  const title = value.title?.trim() || "Embedded content";
  const caption = value.caption?.trim();
  const mode =
    value.sizing === "auto"
      ? "auto"
      : value.sizing === "aspect"
        ? "aspect"
        : "height";
  const height = value.height && value.height > 0 ? value.height : 600;
  const aspectRatio = value.aspectRatio || "16/9";

  return (
    <figure className="my-8">
      <EmbedFrame
        url={url}
        title={title}
        mode={mode}
        height={height}
        aspectRatio={aspectRatio}
      />
      {caption ? (
        <figcaption className={CAPTION_CLASS}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}
