import {
    resolveSanityDocumentHref,
    resolveSanityDocumentLabel,
    type SanityLinkDocument,
} from '@pakfactory/sanity/resolve-document-href';
import {isBlogSitePath} from '@pakfactory/sanity/blog-site-paths';
import type {FooterSocialPlatform} from '@pakfactory/sanity/social-platforms';
import {categoryHref} from '@/lib/blog-post-url';
import {getWwwUrl} from '@/lib/site';

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
    | 'chatgpt'
    | 'gemini'
    | 'perplexity'
    | 'claude'
    | 'grok';

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

export type BlogFooterCtaAlign = 'left' | 'center' | 'right';

export type BlogFooterCtaBlock = {
    key: string;
    message: string;
    buttonLabel: string;
    align: BlogFooterCtaAlign;
    href: string;
    external: boolean;
    showTopBorder?: boolean;
    showBottomBorder?: boolean;
};

export type BlogFooterData = {
    columns: BlogFooterColumns;
    social: BlogSocialLink[];
    aiLinks: BlogAiLink[];
    builder: BlogFooterCtaBlock[];
};

const PAKFACTORY_AI_PROMPT = buildPakFactoryAiPrompt();

function pakFactoryBrandDomain(): string {
    try {
        return new URL(getWwwUrl()).hostname.replace(/^www\./, '');
    } catch {
        return 'pakfactory.com';
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
        case 'chatgpt':
            return `https://chatgpt.com/?q=${q}`;
        case 'gemini':
            return `https://gemini.google.com/app?q=${q}`;
        case 'perplexity':
            return `https://www.perplexity.ai/search?q=${q}`;
        case 'claude':
            return `https://claude.ai/new?q=${q}`;
        case 'grok':
            return `https://grok.com/?q=${q}`;
    }
}

/** Hardcoded social links when Studio footer social links are empty or unavailable. */
export function getFallbackSocialLinks(): BlogSocialLink[] {
    return [
        {
            platform: 'instagram',
            url: 'https://www.instagram.com/pakfactory',
        },
        {
            platform: 'facebook',
            url: 'https://www.facebook.com/pakfactory',
        },
        {
            platform: 'linkedin',
            url: 'https://www.linkedin.com/company/pakfactory',
        },
        {
            platform: 'youtube',
            url: 'https://www.youtube.com/@pakfactory',
        },
        {
            platform: 'pinterest',
            url: 'https://www.pinterest.com/pakfactory',
        },
    ];
}

/** Hardcoded AI answer links when Studio footer AI links are empty or unavailable. */
export function getFallbackAiLinks(): BlogAiLink[] {
    const engines: BlogAiEngine[] = [
        'chatgpt',
        'gemini',
        'perplexity',
        'claude',
        'grok',
    ];

    return engines.map((engine) => ({
        engine,
        url: buildAiAnswerUrl(engine, PAKFACTORY_AI_PROMPT),
    }));
}

/** Hardcoded collaboration CTA when Studio CTA is empty or unavailable. */
export function getFallbackFooterCta(): BlogFooterCta {
    return {
        message: "Let's collaborate and craft\nyour vision",
        buttonLabel: " Let's talk",
        href: `${getWwwUrl()}/contact`,
        external: true,
    };
}

/** Single centered CTA block built from {@link getFallbackFooterCta}. */
export function getFallbackFooterBuilder(): BlogFooterCtaBlock[] {
    const cta = getFallbackFooterCta();
    return [
        {
            key: 'fallback-cta',
            message: cta.message,
            buttonLabel: cta.buttonLabel,
            align: 'center',
            href: cta.href,
            external: cta.external,
        },
    ];
}

/** Full footer data fallback when Sanity is unconfigured or fetch fails. */
export function getFallbackFooterData(): BlogFooterData {
    return {
        columns: getFallbackFooterColumns(),
        social: getFallbackSocialLinks(),
        aiLinks: getFallbackAiLinks(),
        builder: getFallbackFooterBuilder(),
    };
}

const BLOG_CATEGORY_LINKS = [
    {slug: 'packaging-news', label: 'Packaging News'},
    {slug: 'trends', label: 'Trends'},
    {slug: 'business-strategy', label: 'Business Strategy'},
    {slug: 'sustainability', label: 'Sustainability'},
    {slug: 'design-inspiration', label: 'Design Inspiration'},
] as const;

/** Hardcoded footer link columns when Studio footer navigation is empty or unavailable. */
export function getFallbackFooterColumns(): BlogFooterColumns {
    const WWW = getWwwUrl();

    return [
        [
            {
                title: 'Browse the Blog',
                links: [
                    ...BLOG_CATEGORY_LINKS.map(({slug, label}) => ({
                        label,
                        href: categoryHref(slug),
                    })),
                    {label: 'All Topics', href: '/topics'},
                ],
            },
            {
                title: 'Explore PakFactory',
                links: [
                    {label: 'About', href: `${WWW}/about`, external: true},
                    {
                        label: 'Case Studies',
                        href: `${WWW}/case-studies`,
                        external: true,
                    },
                    {
                        label: 'Resources',
                        href: `${WWW}/resources`,
                        external: true,
                    },
                    {
                        label: 'Get a Quote',
                        href: `${WWW}/contact`,
                        external: true,
                    },
                    {label: 'Contribute to the Blog', href: '/contribute'},
                ],
            },
        ],
        [
            {
                title: 'Capabilities',
                links: [
                    {
                        label: 'Rigid Boxes',
                        href: `${WWW}/capabilities`,
                        external: true,
                    },
                    {
                        label: 'Folding Cartons',
                        href: `${WWW}/capabilities`,
                        external: true,
                    },
                    {
                        label: 'Custom Pouches',
                        href: `${WWW}/capabilities`,
                        external: true,
                    },
                    {
                        label: 'Labels & Stickers',
                        href: `${WWW}/capabilities`,
                        external: true,
                    },
                    {
                        label: 'View All',
                        href: `${WWW}/capabilities`,
                        external: true,
                    },
                ],
            },
        ],
        [
            {
                title: 'Our Services',
                links: [
                    {
                        label: 'Packaging Strategy',
                        href: `${WWW}/solutions`,
                        external: true,
                    },
                    {
                        label: 'Packaging Design',
                        href: `${WWW}/solutions`,
                        external: true,
                    },
                    {
                        label: 'Prototyping',
                        href: `${WWW}/solutions`,
                        external: true,
                    },
                    {
                        label: 'Managed Manufacturing',
                        href: `${WWW}/solutions`,
                        external: true,
                    },
                    {
                        label: 'Logistics',
                        href: `${WWW}/solutions`,
                        external: true,
                    },
                    {
                        label: 'Packaging Fulfillment',
                        href: `${WWW}/solutions`,
                        external: true,
                    },
                    {
                        label: 'View All',
                        href: `${WWW}/solutions`,
                        external: true,
                    },
                ],
            },
        ],
    ];
}

type FooterNavLinkRow = {
    label?: string | null;
    linkType?: string | null;
    internalKind?: string | null;
    externalUrl?: string | null;
    sitePath?: string | null;
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

type FooterBuilderBlockRow = {
    _key?: string | null;
    _type?: string | null;
    message?: string | null;
    buttonLabel?: string | null;
    align?: string | null;
    showTopBorder?: boolean | null;
    showBottomBorder?: boolean | null;
    linkType?: string | null;
    internalKind?: string | null;
    externalUrl?: string | null;
    sitePath?: string | null;
    internalLink?: SanityLinkDocument | null;
};

export type BlogFooterNavDoc = {
    _id?: string;
    builder?: (FooterBuilderBlockRow | null)[] | null;
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
    'instagram',
    'facebook',
    'linkedin',
    'youtube',
    'pinterest',
    'x',
]);

const AI_ENGINES = new Set<BlogAiEngine>([
    'chatgpt',
    'gemini',
    'perplexity',
    'claude',
    'grok',
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
            const platform = link.platform?.trim() ?? '';
            const url = link.url?.trim() ?? '';
            if (!isSocialPlatform(platform) || !url) return null;
            return {platform, url};
        })
        .filter((link): link is BlogSocialLink => link != null);

    return links.length > 0 ? links : doc?._id ? [] : getFallbackSocialLinks();
}

export function resolveFooterAiLinks(doc: BlogFooterNavDoc): BlogAiLink[] {
    const links = (doc?.aiLinks ?? [])
        .filter((link): link is FooterAiLinkRow => link != null)
        .map((link) => {
            const engine = link.engine?.trim() ?? '';
            const url = link.url?.trim() ?? '';
            if (!isAiEngine(engine) || !url) return null;
            return {engine, url};
        })
        .filter((link): link is BlogAiLink => link != null);

    return links.length > 0 ? links : doc?._id ? [] : getFallbackAiLinks();
}

function resolveFooterCtaAlign(
    value: string | null | undefined,
): BlogFooterCtaAlign {
    if (value === 'left' || value === 'right' || value === 'center') {
        return value;
    }
    return 'center';
}

export function resolveFooterBuilder(
    doc: BlogFooterNavDoc,
): BlogFooterCtaBlock[] {
    const fallback = getFallbackFooterCta();
    const rows = (doc?.builder ?? []).filter(
        (block): block is FooterBuilderBlockRow =>
            block != null && block._type === 'ctaTextAndButton',
    );

    const blocks = rows.map((block, index) => {
        const message = block.message?.trim() || fallback.message;
        const buttonLabel = block.buttonLabel?.trim() || fallback.buttonLabel;
        const align = resolveFooterCtaAlign(block.align);
        const resolved = resolveFooterLinkHref({
            linkType: block.linkType,
            internalKind: block.internalKind,
            externalUrl: block.externalUrl,
            sitePath: block.sitePath,
            internalLink: block.internalLink,
            label: buttonLabel,
        });

        return {
            key: block._key?.trim() || `footer-cta-${index}`,
            message,
            buttonLabel,
            align,
            href: resolved?.href ?? fallback.href,
            external: resolved?.external ?? fallback.external,
            showTopBorder:
                typeof block.showTopBorder === 'boolean'
                    ? block.showTopBorder
                    : undefined,
            showBottomBorder:
                typeof block.showBottomBorder === 'boolean'
                    ? block.showBottomBorder
                    : undefined,
        };
    });

    return blocks.length > 0
        ? blocks
        : doc?._id
          ? []
          : getFallbackFooterBuilder();
}

export function resolveFooterData(doc: BlogFooterNavDoc): BlogFooterData {
    const columns = resolveFooterColumns(doc);
    return {
        columns: doc?._id ? columns : getFallbackFooterColumns(),
        social: resolveFooterSocialLinks(doc),
        aiLinks: resolveFooterAiLinks(doc),
        builder: resolveFooterBuilder(doc),
    };
}

export function resolveFooterLinkHref(link: FooterNavLinkRow): {
    href: string;
    external: boolean;
    label: string;
} | null {
    if (link.linkType === 'external') {
        const href = link.externalUrl?.trim();
        if (!href) return null;
        return {
            href,
            external: true,
            label: link.label?.trim() ?? href,
        };
    }

    // Legacy: top-level path, or stored Internal → Site path (field removed from Studio).
    if (
        link.linkType === 'path' ||
        (link.linkType === 'internal' && link.internalKind === 'path')
    ) {
        const sitePath = link.sitePath?.trim();
        if (!isBlogSitePath(sitePath)) return null;
        return {
            href: sitePath,
            external: false,
            label: link.label?.trim() ?? sitePath,
        };
    }

    if (link.linkType === 'internal' && link.internalLink) {
        const resolved = resolveSanityDocumentHref(link.internalLink, {
            surface: 'blog',
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
            external: link.external ?? legacyHref.startsWith('http'),
            label: link.label?.trim() ?? legacyHref,
        };
    }

    return null;
}

/**
 * TEMP (launch polish): the Studio "Browse by Topics" footer section still
 * links to legacy Magento pages (custom-packaging-products.html,
 * option-library.html, …). Until editors relink them in Studio (linkType
 * "path" with sitePath "/topics?group=…"), remap those axis links onto the
 * blog's own topics index so they render as internal links under the same
 * base path as the "Browse by Categories" links. Remove once Studio content
 * is updated — the remap only fires on external *.html old-site URLs inside
 * a "Browse by Topics" section, so corrected content bypasses it naturally.
 */
const LEGACY_TOPICS_SECTION = /browse by topics/i;
const LEGACY_OLD_SITE_LINK = /^https?:\/\/(www\.)?pakfactory\.com\/.+\.html/i;
/** Footer axis label → blog topics path (slugs from live `blogTopicGroup` docs). */
const TOPIC_AXIS_PATHS: Record<string, string> = {
    'packaging type': '/topics?group=packaging-type',
    industry: '/topics?group=industry',
    'packaging material': '/topics?group=material',
    'packaging finish': '/topics?group=finish',
};

function remapLegacyTopicLink(
    sectionTitle: string,
    link: {label: string; href: string; external?: boolean},
): {label: string; href: string; external?: boolean} {
    if (!LEGACY_TOPICS_SECTION.test(sectionTitle)) return link;
    if (!link.external || !LEGACY_OLD_SITE_LINK.test(link.href)) return link;
    const mapped =
        TOPIC_AXIS_PATHS[link.label.trim().toLowerCase()] ?? '/topics';
    return {label: link.label, href: mapped};
}

export function resolveFooterColumns(doc: BlogFooterNavDoc): BlogFooterColumns {
    if (!doc?._id) {
        return [];
    }

    return (doc.columns ?? [])
        .filter((column): column is FooterNavColumnRow => column != null)
        .map((column) =>
            (column.sections ?? [])
                .filter(
                    (section): section is FooterNavSectionRow =>
                        section != null,
                )
                .map((section) => {
                    const title = section.title?.trim() ?? '';
                    const links = (section.links ?? [])
                        .filter(
                            (link): link is FooterNavLinkRow => link != null,
                        )
                        .map((link) => resolveFooterLinkHref(link))
                        .filter(
                            (
                                link,
                            ): link is NonNullable<
                                ReturnType<typeof resolveFooterLinkHref>
                            > => link != null,
                        )
                        .map(({label, href, external}) =>
                            remapLegacyTopicLink(title, {
                                label,
                                href,
                                ...(external ? {external: true} : {}),
                            }),
                        );

                    return {title, links};
                })
                .filter((section) => section.title && section.links.length > 0),
        )
        .filter((column) => column.length > 0);
}
