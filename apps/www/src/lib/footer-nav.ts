import type {
  AiEngine,
  AiLink,
  FooterColumns,
  FooterLink,
  SocialLink,
  SocialPlatform,
} from "@pakfactory/components/layout/site-footer";
import { BLOG_URL } from "@/lib/www-nav";

// ─── Raw Sanity shape (mirrors BLOG_FOOTER_NAV_QUERY) ─────────────────────────

type RawLink = {
  label?: string | null;
  linkType?: string | null;
  externalUrl?: string | null;
  sitePath?: string | null;
  href?: string | null;
  external?: boolean | null;
};

type RawSection = {
  title?: string | null;
  links?: (RawLink | null)[] | null;
};

type RawColumn = {
  sections?: (RawSection | null)[] | null;
};

export type RawFooterDoc = {
  _id?: string;
  columns?: (RawColumn | null)[] | null;
  social?: ({ platform?: string | null; url?: string | null } | null)[] | null;
  aiLinks?: ({ engine?: string | null; url?: string | null } | null)[] | null;
} | null;

// ─── Resolvers ────────────────────────────────────────────────────────────────

const SOCIAL_PLATFORMS = new Set<string>([
  "instagram", "facebook", "linkedin", "youtube", "pinterest", "x",
]);

const AI_ENGINES = new Set<string>([
  "chatgpt", "gemini", "perplexity", "claude", "grok",
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
