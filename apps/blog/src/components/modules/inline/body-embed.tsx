import { isAllowedEmbedUrl } from "@pakfactory/sanity/embed-allowlist";
import { fetchBlogGlobalSettings } from "@/lib/blog-global-settings";
import type { PostBodyEmbed } from "@/lib/blog-post";
import { EmbedFrame } from "./embed-frame";

type BodyEmbedProps = {
  value: PostBodyEmbed;
};

const STANDARD_HEIGHT = 600;

/**
 * Inline iframe embed authored in the post body. Security boundary: the URL is
 * only rendered when it passes the allowlist (baseline hosts ∪ admin-managed
 * Settings.additionalEmbedHosts). Sizing (fixed / auto), width,
 * centering and the caption are handled by the client EmbedFrame.
 */
export async function BodyEmbed({ value }: BodyEmbedProps) {
  const url = value.url?.trim();
  if (!url) return null;

  const settings = await fetchBlogGlobalSettings();
  const additionalHosts = settings?.additionalEmbedHosts ?? [];
  if (!isAllowedEmbedUrl(url, additionalHosts)) return null;

  const mode = value.sizing === "auto" ? "auto" : "height";

  // Auto: standard fallback (full content-body width + STANDARD_HEIGHT) until
  // the embed reports its own size. Fixed: authored width/height (centered).
  const height =
    mode === "auto"
      ? STANDARD_HEIGHT
      : value.height && value.height > 0
        ? value.height
        : STANDARD_HEIGHT;
  const width =
    mode === "auto"
      ? undefined
      : value.width && value.width > 0
        ? value.width
        : undefined;

  return (
    <EmbedFrame
      url={url}
      title={value.title?.trim() || "Embedded content"}
      mode={mode}
      height={height}
      width={width}
      caption={value.caption?.trim() || undefined}
    />
  );
}
