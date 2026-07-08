import { isAllowedEmbedUrl } from "@pakfactory/sanity/embed-allowlist";
import { fetchBlogGlobalSettings } from "@/lib/blog-global-settings";
import type { PostBodyEmbed } from "@/lib/blog-post";
import { EmbedFrame } from "./embed-frame";

type BodyEmbedProps = {
  value: PostBodyEmbed;
};

const STANDARD_HEIGHT = 600;

function parseRatio(ratio: string): number {
  const [w, h] = ratio.split("/").map(Number);
  return w && h ? w / h : 16 / 9;
}

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

  const rawHeight = value.height && value.height > 0 ? value.height : undefined;
  const rawWidth = value.width && value.width > 0 ? value.width : undefined;

  let height = STANDARD_HEIGHT;
  let width: number | undefined;
  if (mode === "auto") {
    // Inputs disabled — fall back to a standard size (full content-body width +
    // STANDARD_HEIGHT) until the embed reports its own dimensions.
    height = STANDARD_HEIGHT;
    width = undefined;
  } else if (mode === "aspect") {
    // Ratio-linked: use whichever dimension is authored and derive the width
    // from the height; CSS aspect-ratio then maintains the ratio either way.
    width = rawWidth ?? (rawHeight ? Math.round(rawHeight * parseRatio(value.aspectRatio || "16/9")) : undefined);
  } else {
    height = rawHeight ?? STANDARD_HEIGHT;
    width = rawWidth;
  }

  return (
    <EmbedFrame
      url={url}
      title={value.title?.trim() || "Embedded content"}
      mode={mode}
      height={height}
      width={width}
      aspectRatio={value.aspectRatio || "16/9"}
      caption={value.caption?.trim() || undefined}
    />
  );
}
