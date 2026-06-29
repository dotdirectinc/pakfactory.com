import {
  resolveSanityDocumentHref,
  resolveSanityDocumentLabel,
  type SanityLinkDocument,
} from "@pakfactory/sanity/resolve-document-href";
import { categoryHref } from "@/lib/blog-post-url";
import { getWwwUrl } from "@/lib/site";

export type BlogFooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type BlogFooterSection = {
  title: string;
  links: BlogFooterLink[];
};

/** Footer link grid: one array of sections per column (left to right). */
export type BlogFooterColumns = BlogFooterSection[][];

const BLOG_CATEGORY_LINKS = [
  { slug: "packaging-news", label: "Packaging News" },
  { slug: "trends", label: "Trends" },
  { slug: "business-strategy", label: "Business Strategy" },
  { slug: "sustainability", label: "Sustainability" },
  { slug: "design-inspiration", label: "Design Inspiration" },
] as const;

/** Hardcoded footer link columns when Studio footer navigation is empty or unavailable. */
export function getFallbackFooterColumns(): BlogFooterColumns {
  const WWW = getWwwUrl();

  return [
    [
      {
        title: "Browse the Blog",
        links: BLOG_CATEGORY_LINKS.map(({ slug, label }) => ({
          label,
          href: categoryHref(slug),
        })),
      },
      {
        title: "Explore PakFactory",
        links: [
          { label: "About", href: `${WWW}/about`, external: true },
          {
            label: "Case Studies",
            href: `${WWW}/case-studies`,
            external: true,
          },
          { label: "Resources", href: `${WWW}/resources`, external: true },
          { label: "Get a Quote", href: `${WWW}/contact`, external: true },
          { label: "Contribute to the Blog", href: "/contribute" },
        ],
      },
    ],
    [
      {
        title: "Capabilities",
        links: [
          {
            label: "Rigid Boxes",
            href: `${WWW}/capabilities`,
            external: true,
          },
          {
            label: "Folding Cartons",
            href: `${WWW}/capabilities`,
            external: true,
          },
          {
            label: "Custom Pouches",
            href: `${WWW}/capabilities`,
            external: true,
          },
          {
            label: "Labels & Stickers",
            href: `${WWW}/capabilities`,
            external: true,
          },
          {
            label: "View All",
            href: `${WWW}/capabilities`,
            external: true,
          },
        ],
      },
    ],
    [
      {
        title: "Our Services",
        links: [
          {
            label: "Packaging Strategy",
            href: `${WWW}/solutions`,
            external: true,
          },
          {
            label: "Packaging Design",
            href: `${WWW}/solutions`,
            external: true,
          },
          {
            label: "Prototyping",
            href: `${WWW}/solutions`,
            external: true,
          },
          {
            label: "Managed Manufacturing",
            href: `${WWW}/solutions`,
            external: true,
          },
          { label: "Logistics", href: `${WWW}/solutions`, external: true },
          {
            label: "Packaging Fulfillment",
            href: `${WWW}/solutions`,
            external: true,
          },
          { label: "View All", href: `${WWW}/solutions`, external: true },
        ],
      },
    ],
  ];
}

type FooterNavLinkRow = {
  label?: string | null;
  linkType?: string | null;
  externalUrl?: string | null;
  /** Legacy shape — resolved until migration converts all footer links. */
  href?: string | null;
  external?: boolean | null;
  internalLink?: SanityLinkDocument | null;
};

type FooterNavSectionRow = {
  title?: string | null;
  links?: (FooterNavLinkRow | null)[] | null;
};

type FooterNavColumnRow = {
  sections?: (FooterNavSectionRow | null)[] | null;
};

export type BlogFooterNavDoc = {
  _id?: string;
  columns?: (FooterNavColumnRow | null)[] | null;
} | null;

export function resolveFooterLinkHref(link: FooterNavLinkRow): {
  href: string;
  external: boolean;
  label: string;
} | null {
  if (link.linkType === "external") {
    const href = link.externalUrl?.trim();
    if (!href) return null;
    return {
      href,
      external: true,
      label: link.label?.trim() ?? href,
    };
  }

  if (link.linkType === "internal" && link.internalLink) {
    const resolved = resolveSanityDocumentHref(link.internalLink, {
      surface: "blog",
      wwwOrigin: getWwwUrl(),
    });
    if (!resolved) return null;

    const label =
      link.label?.trim() ||
      resolveSanityDocumentLabel(link.internalLink) ||
      resolved.href;

    return {
      href: resolved.href,
      external: resolved.external,
      label,
    };
  }

  // Legacy href/external fields (pre-reference migration).
  const legacyHref = link.href?.trim();
  if (legacyHref) {
    return {
      href: legacyHref,
      external: link.external ?? legacyHref.startsWith("http"),
      label: link.label?.trim() ?? legacyHref,
    };
  }

  return null;
}

export function resolveFooterColumns(
  doc: BlogFooterNavDoc,
): BlogFooterColumns {
  if (!doc?._id) {
    return [];
  }

  return (doc.columns ?? [])
    .filter((column): column is FooterNavColumnRow => column != null)
    .map((column) =>
      (column.sections ?? [])
        .filter((section): section is FooterNavSectionRow => section != null)
        .map((section) => {
          const title = section.title?.trim() ?? "";
          const links = (section.links ?? [])
            .filter((link): link is FooterNavLinkRow => link != null)
            .map((link) => resolveFooterLinkHref(link))
            .filter(
              (
                link,
              ): link is NonNullable<ReturnType<typeof resolveFooterLinkHref>> =>
                link != null,
            )
            .map(({ label, href, external }) => ({
              label,
              href,
              ...(external ? { external: true } : {}),
            }));

          return { title, links };
        })
        .filter((section) => section.title && section.links.length > 0),
    )
    .filter((column) => column.length > 0);
}
