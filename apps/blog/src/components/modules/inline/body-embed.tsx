import { isAllowedEmbedUrl } from "@pakfactory/sanity/embed-allowlist";
import { fetchBlogGlobalSettings } from "@/lib/blog-global-settings";
import type { PostBodyEmbed } from "@/lib/blog-post";
import { EmbedFrame } from "./embed-frame";

type BodyEmbedProps = {
  value: PostBodyEmbed;
};

/**
 * Inline iframe embed authored in the post body. Security boundary: the URL is
 * only rendered when it passes the allowlist (baseline hosts ∪ admin-managed
 * Settings.additionalEmbedHosts). Sizing (fixed / auto / aspect), width,
 * centering and the caption are handled by the client EmbedFrame.
 */
export async function BodyEmbed({ value }: BodyEmbedProps) {
  const url = value.url?.trim();
  if (!url) return null;

  const settings = await fetchBlogGlobalSettings();
  const additionalHosts = settings?.additionalEmbedHosts ?? [];
  if (!isAllowedEmbedUrl(url, additionalHosts)) return null;

  const mode =
    value.sizing === "auto"
      ? "auto"
      : value.sizing === "aspect"
        ? "aspect"
        : "height";

  return (
    <EmbedFrame
      url={url}
      title={value.title?.trim() || "Embedded content"}
      mode={mode}
      height={value.height && value.height > 0 ? value.height : 600}
      width={value.width && value.width > 0 ? value.width : undefined}
      aspectRatio={value.aspectRatio || "16/9"}
      caption={value.caption?.trim() || undefined}
    />
  );
}
