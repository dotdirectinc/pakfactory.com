import {
  resolveSanityDocumentHref,
  resolveSanityDocumentLabel,
  type SanityLinkDocument,
} from "@pakfactory/sanity/resolve-document-href";
import type { FooterSocialPlatform } from "@pakfactory/sanity/social-platforms";
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

export type BlogSocialPlatform = FooterSocialPlatform;

export type BlogSocialLink = {
  platform: BlogSocialPlatform;
  url: string;
};

export type BlogAiEngine =
  | "chatgpt"
  | "gemini"
  | "perplexity"
  | "claude"
  | "grok";

export type BlogAiLink = {
  engine: BlogAiEngine;
  url: string;
};

export type BlogFooterCta = {
  message: string;
  buttonLabel: string;
  href: string;
  external: boolean;
};

export type BlogFooterData = {
  columns: BlogFooterColumns;
  social: BlogSocialLink[];
  aiLinks: BlogAiLink[];
  cta: BlogFooterCta;
};

const PAKFACTORY_AI_PROMPT = buildPakFactoryAiPrompt();

function pakFactoryBrandDomain(): string {
  try {
    return new URL(getWwwUrl()).hostname.replace(/^www\./, "");
  } catch {
    return "pakfactory.com";
  }
}

/** Neutral, GEO-friendly prompt — brand + domain helps AI retrieve the right entity. */
export function buildPakFactoryAiPrompt(): string {
  const domain = pakFactoryBrandDomain();
  return `What is PakFactory (${domain})? Summarize what they do, who they serve, and cite your sources.`;
}

function buildAiAnswerUrl(engine: BlogAiEngine, prompt: string): string {
  const q = encodeURIComponent(prompt);
  switch (engine) {
    case "chatgpt":
      return `https://chatgpt.com/?q=${q}`;
    case "gemini":
      return `https://gemini.google.com/app?q=${q}`;
    case "perplexity":
      return `https://www.perplexity.ai/search?q=${q}`;
    case "claude":
      return `https://claude.ai/new?q=${q}`;
    case "grok":
      return `https://grok.com/?q=${q}`;
  }
}

/** Hardcoded social links when Studio footer social links are empty or unavailable. */
export function getFallbackSocialLinks(): BlogSocialLink[] {
  return [
    {
      platform: "instagram",
      url: "https://www.instagram.com/pakfactory",
    },
    {
      platform: "facebook",
      url: "https://www.facebook.com/pakfactory",
    },
    {
      platform: "linkedin",
      url: "https://www.linkedin.com/company/pakfactory",
    },
    {
      platform: "youtube",
      url: "https://www.youtube.com/@pakfactory",
    },
    {
      platform: "pinterest",
      url: "https://www.pinterest.com/pakfactory",
    },
  ];
}

/** Hardcoded AI answer links when Studio footer AI links are empty or unavailable. */
export function getFallbackAiLinks(): BlogAiLink[] {
  const engines: BlogAiEngine[] = [
    "chatgpt",
    "gemini",
    "perplexity",
    "claude",
    "grok",
  ];

  return engines.map((engine) => ({
    engine,
    url: buildAiAnswerUrl(engine, PAKFACTORY_AI_PROMPT),
  }));
}

/** Full footer data fallback when Sanity is unconfigured or fetch fails. */
export function getFallbackFooterData(): BlogFooterData {
  return {
    columns: getFallbackFooterColumns(),
    social: getFallbackSocialLinks(),
    aiLinks: getFallbackAiLinks(),
    cta: getFallbackFooterCta(),
  };
}

/** Hardcoded collaboration CTA when Studio CTA is empty or unavailable. */
export function getFallbackFooterCta(): BlogFooterCta {
  return {
    message: "Let's collaborate and craft\nyour vision",
    buttonLabel: "Let's talk",
    href: `${getWwwUrl()}/contact`,
    external: true,
  };
}

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
        links: [
          ...BLOG_CATEGORY_LINKS.map(({ slug, label }) => ({
            label,
            href: categoryHref(slug),
          })),
          { label: "All Topics", href: "/topics" },
        ],
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

type FooterCtaRow = {
  message?: string | null;
  buttonLabel?: string | null;
  linkType?: string | null;
  externalUrl?: string | null;
  internalLink?: SanityLinkDocument | null;
};

export type BlogFooterNavDoc = {
  _id?: string;
  cta?: FooterCtaRow | null;
  columns?: (FooterNavColumnRow | null)[] | null;
  social?: (FooterSocialLinkRow | null)[] | null;
  aiLinks?: (FooterAiLinkRow | null)[] | null;
} | null;

type FooterSocialLinkRow = {
  platform?: string | null;
  url?: string | null;
};

type FooterAiLinkRow = {
  engine?: string | null;
  url?: string | null;
};

const SOCIAL_PLATFORMS = new Set<BlogSocialPlatform>([
  "instagram",
  "facebook",
  "linkedin",
  "youtube",
  "pinterest",
  "x",
]);

const AI_ENGINES = new Set<BlogAiEngine>([
  "chatgpt",
  "gemini",
  "perplexity",
  "claude",
  "grok",
]);

function isSocialPlatform(value: string): value is BlogSocialPlatform {
  return SOCIAL_PLATFORMS.has(value as BlogSocialPlatform);
}

function isAiEngine(value: string): value is BlogAiEngine {
  return AI_ENGINES.has(value as BlogAiEngine);
}

export function resolveFooterSocialLinks(
  doc: BlogFooterNavDoc,
): BlogSocialLink[] {
  const links = (doc?.social ?? [])
    .filter((link): link is FooterSocialLinkRow => link != null)
    .map((link) => {
      const platform = link.platform?.trim() ?? "";
      const url = link.url?.trim() ?? "";
      if (!isSocialPlatform(platform) || !url) return null;
      return { platform, url };
    })
    .filter((link): link is BlogSocialLink => link != null);

  return links.length > 0 ? links : getFallbackSocialLinks();
}

export function resolveFooterAiLinks(doc: BlogFooterNavDoc): BlogAiLink[] {
  const links = (doc?.aiLinks ?? [])
    .filter((link): link is FooterAiLinkRow => link != null)
    .map((link) => {
      const engine = link.engine?.trim() ?? "";
      const url = link.url?.trim() ?? "";
      if (!isAiEngine(engine) || !url) return null;
      return { engine, url };
    })
    .filter((link): link is BlogAiLink => link != null);

  return links.length > 0 ? links : getFallbackAiLinks();
}

export function resolveFooterCta(doc: BlogFooterNavDoc): BlogFooterCta {
  const fallback = getFallbackFooterCta();
  const cta = doc?.cta;
  if (!cta) return fallback;

  const message = cta.message?.trim() || fallback.message;
  const buttonLabel = cta.buttonLabel?.trim() || fallback.buttonLabel;

  const resolved = resolveFooterLinkHref({
    linkType: cta.linkType,
    externalUrl: cta.externalUrl,
    internalLink: cta.internalLink,
    label: buttonLabel,
  });

  if (!resolved) {
    return {
      message,
      buttonLabel,
      href: fallback.href,
      external: fallback.external,
    };
  }

  return {
    message,
    buttonLabel,
    href: resolved.href,
    external: resolved.external,
  };
}

export function resolveFooterData(doc: BlogFooterNavDoc): BlogFooterData {
  const columns = resolveFooterColumns(doc);
  return {
    columns: columns.length > 0 ? columns : getFallbackFooterColumns(),
    social: resolveFooterSocialLinks(doc),
    aiLinks: resolveFooterAiLinks(doc),
    cta: resolveFooterCta(doc),
  };
}

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
