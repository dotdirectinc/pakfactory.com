import {
  resolveSanityDocumentHref,
  type SanityLinkDocument,
} from "@pakfactory/sanity/resolve-document-href";
import type {
  AiEngine,
  AiLink,
  FooterColumns,
  FooterLink,
  SocialLink,
  SocialPlatform,
} from "@pakfactory/components/layout/site-footer";
import { BLOG_URL } from "@/lib/www-nav";
import { getWwwUrl } from "@/lib/site";

// ─── Raw Sanity shape (mirrors BLOG_FOOTER_NAV_QUERY) ─────────────────────────

type RawLink = {
  label?: string | null;
  linkType?: string | null;
  externalUrl?: string | null;
  sitePath?: string | null;
  href?: string | null;
  external?: boolean | null;
  internalLink?: SanityLinkDocument | null;
};

type RawSection = {
  title?: string | null;
  links?: (RawLink | null)[] | null;
};

type RawColumn = {
  sections?: (RawSection | null)[] | null;
};

type RawCtaBlock = {
  _type?: string | null;
  buttonLabel?: string | null;
  linkType?: string | null;
  externalUrl?: string | null;
  sitePath?: string | null;
  internalLink?: SanityLinkDocument | null;
};

export type RawFooterDoc = {
  _id?: string;
  columns?: (RawColumn | null)[] | null;
  social?: ({ platform?: string | null; url?: string | null } | null)[] | null;
  aiLinks?: ({ engine?: string | null; url?: string | null } | null)[] | null;
  /** Shared footerNavigation.builder — same source as the blog's footer CTA blocks. */
  builder?: (RawCtaBlock | null)[] | null;
} | null;

// ─── Resolvers ────────────────────────────────────────────────────────────────

const SOCIAL_PLATFORMS = new Set<string>([
  "instagram", "facebook", "linkedin", "youtube", "pinterest", "x",
]);

const AI_ENGINES = new Set<string>([
  "chatgpt", "gemini", "perplexity", "claude", "grok",
]);

// Doc types that live on the blog surface — their paths must be prefixed with BLOG_URL.
const BLOG_DOC_TYPES = new Set([
  "blogCategory", "blogPage", "post", "blogTag", "author",
]);

function resolveLink(raw: RawLink): FooterLink | null {
  const label = raw.label?.trim();
  if (!label) return null;

  if (raw.linkType === "external") {
    const href = raw.externalUrl?.trim();
    if (!href) return null;
    return { label, href, external: true };
  }

  if (raw.linkType === "path") {
    const path = raw.sitePath?.trim();
    if (!path) return null;
    return { label, href: `${BLOG_URL}${path}`, external: true };
  }

  if (raw.linkType === "internal" && raw.internalLink) {
    const resolved = resolveSanityDocumentHref(raw.internalLink, {
      surface: "blog",
      wwwOrigin: getWwwUrl(),
    });
    if (!resolved) return null;
    const isBlogDoc = BLOG_DOC_TYPES.has(raw.internalLink._type ?? "");
    const href = isBlogDoc ? `${BLOG_URL}${resolved.href}` : resolved.href;
    return { label, href, external: true };
  }

  // Legacy href field
  const href = raw.href?.trim();
  if (href) {
    return { label, href, external: raw.external ?? href.startsWith("http") };
  }

  return null;
}

/** Returns resolved columns, or null if the doc is missing/empty (caller should fall back). */
export function resolveFooterColumns(doc: RawFooterDoc): FooterColumns | null {
  if (!doc?._id) return null;

  const columns = (doc.columns ?? [])
    .filter((c): c is RawColumn => c != null)
    .map((col) =>
      (col.sections ?? [])
        .filter((s): s is RawSection => s != null)
        .map((sec) => {
          const title = sec.title?.trim() ?? "";
          const links = (sec.links ?? [])
            .filter((l): l is RawLink => l != null)
            .map(resolveLink)
            .filter((l): l is FooterLink => l != null);
          return { title, links };
        })
        .filter((s) => s.title && s.links.length > 0),
    )
    .filter((col) => col.length > 0);

  return columns.length > 0 ? columns : null;
}

export function resolveFooterSocial(doc: RawFooterDoc): SocialLink[] | null {
  if (!doc?._id) return null;
  const links = (doc.social ?? [])
    .filter((s): s is { platform: string; url: string } => !!s?.platform && !!s?.url)
    .filter((s) => SOCIAL_PLATFORMS.has(s.platform))
    .map((s) => ({ platform: s.platform as SocialPlatform, url: s.url }));
  return links.length > 0 ? links : null;
}

export function resolveFooterAiLinks(doc: RawFooterDoc): AiLink[] | null {
  if (!doc?._id) return null;
  const links = (doc.aiLinks ?? [])
    .filter((a): a is { engine: string; url: string } => !!a?.engine && !!a?.url)
    .filter((a) => AI_ENGINES.has(a.engine))
    .map((a) => ({ engine: a.engine as AiEngine, url: a.url }));
  return links.length > 0 ? links : null;
}

export type FooterCta = { label: string; href: string };

/**
 * Footer "Let's talk" CTA button — resolved from the first `ctaTextAndButton`
 * block in Studio's shared `footerNavigation.builder` (the same source the
 * blog's footer reads via `resolveFooterBuilder`). Returns null when Studio
 * has no doc or no valid CTA block; caller falls back to its own default.
 */
export function resolveFooterCta(doc: RawFooterDoc): FooterCta | null {
  if (!doc?._id) return null;

  const block = (doc.builder ?? []).find(
    (b): b is RawCtaBlock => b != null && b._type === "ctaTextAndButton",
  );
  if (!block) return null;

  const resolved = resolveLink({
    label: block.buttonLabel,
    linkType: block.linkType,
    externalUrl: block.externalUrl,
    sitePath: block.sitePath,
    internalLink: block.internalLink,
  });
  if (!resolved) return null;

  return { label: resolved.label, href: resolved.href };
}
