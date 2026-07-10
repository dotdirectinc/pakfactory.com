/**
 * Resolve a Sanity document reference to a public href for blog or www surfaces.
 * Used by blog footer nav and reusable for future cross-surface linking.
 */

export type DocumentHrefSurface = "blog" | "www";

export type SanityLinkDocument = {
  _type?: string | null;
  title?: string | null;
  name?: string | null;
  term?: string | null;
  slug?: string | null;
  pageRole?: string | null;
  pageType?: string | null;
  category?: string | null;
  handle?: string | null;
  collectionSlug?: string | null;
  pageSlug?: string | null;
};

export type ResolvedDocumentHref = {
  href: string;
  external: boolean;
};

export type ResolveDocumentHrefOptions = {
  surface: DocumentHrefSurface;
  /** Marketing site origin (no trailing slash). Required when resolving www docs on the blog surface. */
  wwwOrigin?: string;
};

const BLOG_SURFACE_TYPES = new Set([
  "blogCategory",
  "blogPage",
  "post",
  "blogTag",
  "author",
]);

const STATIC_SINGLETON_PATHS: Record<string, string> = {
  aboutPage: "/about",
  contactPage: "/contact",
  privacyPolicy: "/privacy",
  termsOfService: "/terms",
};

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, "");
}

function withLeadingSlash(path: string): string {
  if (!path || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function joinOrigin(origin: string, path: string): string {
  const normalizedPath = withLeadingSlash(path);
  if (normalizedPath === "/") return normalizeOrigin(origin);
  return `${normalizeOrigin(origin)}${normalizedPath}`;
}

/** Root-relative path for a document, or null when required fields are missing. */
export function resolveDocumentPath(doc: SanityLinkDocument): string | null {
  const type = doc._type ?? "";
  const slug = doc.slug?.trim();

  if (STATIC_SINGLETON_PATHS[type]) {
    return STATIC_SINGLETON_PATHS[type];
  }

  switch (type) {
    case "blogCategory":
    case "blogPage":
      if (doc.pageRole === "home") return "/";
      if (doc.pageRole === "topics") return "/topics";
      if (doc.pageRole === "search") return "/search";
      if (doc.pageRole === "contribute") return "/contribute";
      return slug ? `/${slug}` : null;
    case "post":
      return slug ? `/${slug}` : null;
    case "blogTag":
      return slug ? `/topics/${slug}` : null;
    case "author":
      return slug ? `/author/${slug}` : null;
    case "page":
      if (doc.pageType === "home" || doc.pageRole === "home") return "/";
      return slug ? `/${slug}` : null;
    case "product": {
      const handle = doc.handle?.trim();
      const collectionSlug = doc.collectionSlug?.trim();
      const pageSlug = doc.pageSlug?.trim();
      if (handle && collectionSlug && pageSlug) {
        return `/products/${pageSlug}/${collectionSlug}/${handle}`;
      }
      return null;
    }
    case "solution":
      return slug ? `/solutions/${slug}` : null;
    case "caseStudy":
      return slug ? `/case-studies/${slug}` : null;
    case "capabilityCategory": {
      const category = doc.category?.trim();
      if (category && slug) return `/capabilities/${category}/${slug}`;
      return null;
    }
    case "guide":
    case "glossaryTerm":
    case "helpArticle":
      return slug ? `/resources/${slug}` : null;
    default:
      return null;
  }
}

export function resolveSanityDocumentLabel(
  doc: SanityLinkDocument,
): string | null {
  return (
    doc.title?.trim() ||
    doc.name?.trim() ||
    doc.term?.trim() ||
    doc.slug?.trim() ||
    null
  );
}

export function resolveSanityDocumentHref(
  doc: SanityLinkDocument | null | undefined,
  options: ResolveDocumentHrefOptions,
): ResolvedDocumentHref | null {
  if (!doc?._type) return null;

  const path = resolveDocumentPath(doc);
  if (!path) return null;

  const isBlogDoc = BLOG_SURFACE_TYPES.has(doc._type);

  if (options.surface === "blog") {
    if (isBlogDoc) {
      return { href: path, external: false };
    }
    if (!options.wwwOrigin?.trim()) return null;
    return {
      href: joinOrigin(options.wwwOrigin, path),
      external: true,
    };
  }

  // www surface — all paths relative to marketing origin
  if (!options.wwwOrigin?.trim()) return null;
  return {
    href: joinOrigin(options.wwwOrigin, path),
    external: false,
  };
}
