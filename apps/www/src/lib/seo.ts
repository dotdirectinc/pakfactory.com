import type { Metadata } from "next";

export type WwwRobotsDirective = {
  index: boolean;
  follow: boolean;
};

/**
 * Global indexing kill-switch. When `WWW_DISABLE_INDEXING` is truthy, every
 * www page is forced to `noindex, nofollow` — so non-production origins
 * (e.g. *.vercel.app previews) are never indexed.
 * Leave unset in production; set to "true" in preview/staging environments.
 */
export function isWwwIndexingDisabled(): boolean {
  const v = process.env.WWW_DISABLE_INDEXING?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function robotsDirectiveToMetadata(
  directive: WwwRobotsDirective,
): NonNullable<Metadata["robots"]> {
  if (isWwwIndexingDisabled()) {
    return { index: false, follow: false, nocache: true, noimageindex: true };
  }
  return { index: directive.index, follow: directive.follow };
}
