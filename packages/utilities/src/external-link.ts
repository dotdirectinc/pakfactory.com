export const EXTERNAL_LINK_REL = "nofollow noopener noreferrer";

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}

export function externalLinkAttributes(
  href: string,
): { target: "_blank"; rel: typeof EXTERNAL_LINK_REL } | Record<string, never> {
  return isExternalHref(href) ? { target: "_blank", rel: EXTERNAL_LINK_REL } : {};
}
