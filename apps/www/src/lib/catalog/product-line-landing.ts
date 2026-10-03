import type {PageSectionDoc, PageSectionInspirationsCardDoc} from '@pakfactory/sanity/queries';

import {
    isStandardProduct,
    PRODUCT_LINE_PRODUCT_KIND,
    productsOfKind,
} from '@/lib/catalog/product-kind';
import type {
    Product,
    ProductLine,
    ProductLineFrame,
    ProductStyleRef,
} from '@/lib/catalog/types';
import {
    applyProductStylesInherit,
    mergeSolutionSections,
} from '@/lib/sections/merge-solution-sections';
import {
    applySectionTokens,
    sectionTokenContextFromHost,
} from '@/lib/sections/resolve-section-tokens';
import {productHref} from '@/lib/www-routes';

/** Storyboard H1 for rigid-boxes when Sanity `h1` is empty (PROD-1914). */
export const RIGID_BOXES_MOCK_H1 = 'Made to be kept.';

/**
 * Placeholder intro until design supplies copy. Used only when both
 * shortDescription and description are empty on rigid-boxes.
 */
export const RIGID_BOXES_MOCK_INTRO =
    'Premium rigid packaging built to be kept, gifted, and remembered.';

/**
 * Placeholder frame sequence until Studio `media` or catalog images exist.
 * Local public assets (same treatment as mock H1/intro).
 */
export const RIGID_BOXES_MOCK_FEATURE: ProductLineFrame = {
    src: '/products/rigid-boxes/feature.png',
    alt: 'Kraft rigid box with lid floating above base',
};

/** Featured-icon until Studio supplies a product-line icon asset. */
export const RIGID_BOXES_MOCK_FEATURED_ICON: ProductLineFrame = {
    src: '/products/rigid-boxes/kit-mark.png',
    alt: 'Rigid box dieline icon',
};

/**
 * Local hero MP4 until Studio `featuredVideo` is authored on rigid-boxes.
 * Used by bottomBar hero carousel hover-play (not stack).
 */
export const RIGID_BOXES_MOCK_FEATURED_VIDEO =
    '/products/rigid-boxes/hero-scrub.mp4';

export const RIGID_BOXES_MOCK_FRAMES: ProductLineFrame[] = [
    RIGID_BOXES_MOCK_FEATURE,
];

export type ProductLineLandingStyleCard = {
    slug: string;
    title: string;
    description?: string;
    imageUrl: string | null;
    imageAlt: string;
};

export type ProductLineHeroLayout = 'stack' | 'bottomBar';

/**
 * Shared stack + bottom-bar hero placeholder when a product (or line featured
 * image) has no authored media.
 */
export const PRODUCT_LINE_HERO_FEATURE_PLACEHOLDER =
    '/products/hero-feature-placeholder.svg';

/** Card for the bottomBar hero media carousel. */
export type ProductLineHeroMediaCard = {
    id: string;
    src: string;
    alt: string;
    /** Hover-play MP4 on the featured card when set. */
    videoUrl?: string;
    /** 0-based index within the unique set — L→R settle stagger. */
    settleIndex: number;
    /** Preview dialog — set when card is backed by a catalog product. */
    title?: string;
    detailHref?: string;
    description?: string;
    /** Spec rows for StandardProductPreview (label + value text). */
    properties?: {label: string; value: string}[];
};

/** Industry pill for the product-line Inspiration section. */
export type ProductLineInspirationIndustry = {
    slug: string;
    title: string;
};

/**
 * Unique industries present on inspiration products for a line (title sort).
 * Industries with zero products are never returned.
 */
export function assembleInspirationIndustries(
    products: readonly Product[],
): ProductLineInspirationIndustry[] {
    const bySlug = new Map<string, string>();
    for (const product of products) {
        for (const industry of product.industries ?? []) {
            const slug = industry.slug?.trim();
            const title = industry.title?.trim();
            if (!slug || !title || bySlug.has(slug)) continue;
            bySlug.set(slug, title);
        }
        // Fallback: breadcrumbParent when industries[] was not projected.
        if ((product.industries?.length ?? 0) === 0) {
            const slug = product.breadcrumbParent?.slug?.trim();
            const title = product.breadcrumbParent?.title?.trim();
            if (slug && title && !bySlug.has(slug)) bySlug.set(slug, title);
        }
    }
    return [...bySlug.entries()]
        .map(([slug, title]) => ({slug, title}))
        .sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Resolve left-rail industries for the Inspiration band.
 * - Empty / missing CMS list → all industries with products (title sort).
 * - Curated list → Studio order, only industries that still have products.
 */
export function resolveInspirationIndustries(
    products: readonly Product[],
    curated?: readonly {slug?: string | null; title?: string | null}[] | null,
): ProductLineInspirationIndustry[] {
    const available = assembleInspirationIndustries(products);
    if (!curated?.length) return available;

    const bySlug = new Map(available.map((row) => [row.slug, row]));
    const resolved: ProductLineInspirationIndustry[] = [];
    const seen = new Set<string>();
    for (const row of curated) {
        const slug = row.slug?.trim();
        if (!slug || seen.has(slug)) continue;
        const match = bySlug.get(slug);
        if (!match) continue;
        seen.add(slug);
        resolved.push(match);
    }
    return resolved;
}

/**
 * Inspiration products tagged with the given industry slug (multi-tag OK).
 */
export function filterInspirationProductsByIndustry(
    products: readonly Product[],
    industrySlug: string,
): Product[] {
    const slug = industrySlug.trim();
    if (!slug) return [];
    return products.filter((product) => {
        if (product.industries?.some((industry) => industry.slug === slug)) {
            return true;
        }
        return product.breadcrumbParent?.slug === slug;
    });
}

/** Hard cap for bottomBar hero carousel — keeps image/video payload bounded. */
const HERO_MEDIA_CARD_LIMIT = 10;

/**
 * Build bottomBar hero carousel cards (unique, no density copies).
 * Featured Products first (Studio order), then line `standard` products fill
 * remaining slots — duplicates skipped. Caps at {@link HERO_MEDIA_CARD_LIMIT}.
 * Products without media use {@link PRODUCT_LINE_HERO_FEATURE_PLACEHOLDER}.
 * Fall back to line featured image + frames only when there are no standard
 * products at all.
 */
export function assembleHeroMediaCards(input: {
    featuredImageUrl: string | null;
    featuredImageAlt: string;
    featuredVideoUrl: string | null;
    frames: ProductLineFrame[];
    products?: Product[];
    /** Pinned hero products (Categorization Featured Products). */
    featuredProducts?: Product[];
}): ProductLineHeroMediaCard[] {
    const videoUrl = input.featuredVideoUrl?.trim() || '';
    const cards: ProductLineHeroMediaCard[] = [];
    const seenSlugs = new Set<string>();

    const pushProduct = (product: Product) => {
        if (cards.length >= HERO_MEDIA_CARD_LIMIT) return;
        if (seenSlugs.has(product.slug)) return;
        seenSlugs.add(product.slug);
        const media = product.media?.find((m) => Boolean(m.src?.trim()));
        const src =
            media?.src?.trim() || PRODUCT_LINE_HERO_FEATURE_PLACEHOLDER;
        const alt = media?.src?.trim()
            ? media.alt?.trim() || product.title
            : product.title || 'Product image placeholder';
        const productVideo = product.featuredVideoUrl?.trim() || '';
        const description = product.description?.trim() || '';
        // Match PDP Specs exclusions (buildProductSpecRows) — plain label/value list.
        const excludedSpecLabels = new Set([
            'Dimensions',
            'Minimum order',
            'MOQ',
            'Lead time',
            'Pricing',
        ]);
        const properties: {label: string; value: string}[] = [];
        const styleTitle = product.productStyle?.title?.trim();
        if (styleTitle) {
            properties.push({label: 'Style', value: styleTitle});
        }
        for (const row of product.properties ?? []) {
            const label = row.label.trim();
            if (!label || excludedSpecLabels.has(label)) continue;
            if (styleTitle && label.toLowerCase() === 'style') continue;
            properties.push({
                label,
                value: row.value.trim() || 'N/A',
            });
        }
        cards.push({
            id: product.slug,
            src,
            alt,
            settleIndex: cards.length,
            title: product.title,
            detailHref: productHref(product.slug),
            ...(description ? {description} : {}),
            ...(properties.length > 0 ? {properties} : {}),
            ...(productVideo ? {videoUrl: productVideo} : {}),
        });
    };

    for (const product of productsOfKind(
        input.featuredProducts ?? [],
        PRODUCT_LINE_PRODUCT_KIND,
    )) {
        pushProduct(product);
    }

    for (const product of productsOfKind(
        input.products ?? [],
        PRODUCT_LINE_PRODUCT_KIND,
    )) {
        pushProduct(product);
    }

    if (cards.length === 0) {
        const seen = new Set<string>();
        const push = (
            src: string | null | undefined,
            alt: string,
            id: string,
        ) => {
            if (cards.length >= HERO_MEDIA_CARD_LIMIT) return;
            const url = src?.trim();
            if (!url || seen.has(url)) return;
            seen.add(url);
            cards.push({
                id,
                src: url,
                alt: alt.trim() || 'Product media',
                settleIndex: cards.length,
            });
        };

        const featuredUrl = input.featuredImageUrl?.trim() || '';
        if (featuredUrl) {
            push(featuredUrl, input.featuredImageAlt, 'featured');
        }
        input.frames.forEach((frame, index) => {
            push(frame.src, frame.alt, `frame-${index}`);
        });

        // Frames path: line-level featured video on the first card only.
        if (videoUrl && cards[0]) {
            cards[0] = {...cards[0], videoUrl};
        }
    }

    return cards;
}

export type ProductLineLandingModel = {
    slug: string;
    title: string;
    h1: string;
    intro: string;
    metaTitle?: string;
    metaDescription?: string;
    /** Ordered hero frames; empty when none. */
    frames: ProductLineFrame[];
    /** `sequence` when ≥2 frames; otherwise static frame-1 / featured. */
    heroMode: 'sequence' | 'static';
    /**
     * Landing hero chrome. Sanity wins; unset/unknown → `stack`, except
     * rigid-boxes mock defaults to `bottomBar` for local preview.
     */
    heroLayout: ProductLineHeroLayout;
    featuredImageUrl: string | null;
    featuredImageAlt: string;
    /**
     * Hero MP4 for bottomBar carousel hover-play on the featured card.
     * Stack ignores this (static featured still). Sanity wins; rigid-boxes
     * mock fills when empty.
     */
    featuredVideoUrl: string | null;
    /** Featured icon on the hero; Sanity wins, mock fills blanks for rigid-boxes. */
    featuredIconUrl: string | null;
    featuredIconAlt: string;
    styles: ProductLineLandingStyleCard[] | null;
    /**
     * Merged Product Line Page template × line sections (order/chrome × content).
     * Empty when neither template nor line has sections.
     * Document faqs / featuredStudies / expertise / relatedLines feed inherit
     * into these sections — they are not separate route bands.
     */
    pageSections: PageSectionDoc[];
};

type RigidBoxesMock = {
    h1: string;
    intro: string;
};

const LINE_MOCKS: Record<string, RigidBoxesMock> = {
    'rigid-boxes': {
        h1: RIGID_BOXES_MOCK_H1,
        intro: RIGID_BOXES_MOCK_INTRO,
    },
};

function firstProductImageInStyle(
    products: Product[],
    styleSlug: string,
): {src: string; alt: string} | null {
    for (const product of products) {
        if (!isStandardProduct(product)) continue;
        if (product.productStyle.slug !== styleSlug) continue;
        for (const media of product.media) {
            if (media.src) {
                return {src: media.src, alt: media.alt || product.title};
            }
        }
    }
    return null;
}

/**
 * Style card image: style image → first standard product image in that style.
 * Does not fall back to the line featured / hero image.
 */
export function resolveStyleCardImage(
    style: ProductStyleRef,
    line: Pick<ProductLine, 'products'>,
): {imageUrl: string | null; imageAlt: string} {
    if (style.imageUrl) {
        return {
            imageUrl: style.imageUrl,
            imageAlt: style.imageAlt || style.title,
        };
    }
    const fromProduct = firstProductImageInStyle(line.products, style.slug);
    if (fromProduct) {
        return {imageUrl: fromProduct.src, imageAlt: fromProduct.alt};
    }
    return {imageUrl: null, imageAlt: style.title};
}

/**
 * Collect up to `limit` unique image URLs from the line (featured, styles, products).
 * Used only to pad rigid-boxes frames when Sanity `media` is empty.
 */
function collectCatalogFrameCandidates(
    line: ProductLine,
    limit: number,
): ProductLineFrame[] {
    const seen = new Set<string>();
    const frames: ProductLineFrame[] = [];

    const push = (src: string | null | undefined, alt: string) => {
        const url = src?.trim();
        if (!url || seen.has(url) || frames.length >= limit) return;
        seen.add(url);
        frames.push({src: url, alt});
    };

    push(line.imageUrl, line.imageAlt || line.title);
    for (const style of line.styles) {
        push(style.imageUrl, style.imageAlt || style.title);
    }
    for (const product of line.products) {
        for (const media of product.media) {
            push(media.src, media.alt || product.title);
        }
    }
    return frames;
}

function resolveFrames(line: ProductLine): ProductLineFrame[] {
    const authored = (line.frames ?? []).filter((f) => Boolean(f.src?.trim()));
    if (authored.length > 0) return authored;

    if (line.slug === 'rigid-boxes') {
        const fromCatalog = collectCatalogFrameCandidates(line, 4);
        if (fromCatalog.length >= 2) return fromCatalog;
        return RIGID_BOXES_MOCK_FRAMES;
    }
    return [];
}

function resolveH1(line: ProductLine): string {
    const authored = line.h1?.trim();
    if (authored) return authored;
    const mock = LINE_MOCKS[line.slug];
    if (mock) return mock.h1;
    return line.title;
}

function resolveIntro(line: ProductLine): string {
    const fromShort = line.shortDescription?.trim();
    if (fromShort) return fromShort;
    const fromDescription = line.description?.trim();
    if (fromDescription) return fromDescription;
    const mock = LINE_MOCKS[line.slug];
    if (mock) return mock.intro;
    return '';
}

function resolveFeaturedImage(line: ProductLine): {
    url: string | null;
    alt: string;
} {
    const authored = line.imageUrl?.trim();
    if (authored) {
        return {url: authored, alt: line.imageAlt || line.title};
    }
    if (line.slug === 'rigid-boxes') {
        return {
            url: RIGID_BOXES_MOCK_FEATURE.src,
            alt: RIGID_BOXES_MOCK_FEATURE.alt,
        };
    }
    return {url: null, alt: line.title};
}

function resolveFeaturedIcon(line: ProductLine): {url: string | null; alt: string} {
    const authored = line.featuredIconUrl?.trim();
    if (authored) {
        return {
            url: authored,
            alt: line.featuredIconAlt?.trim() || `${line.title} featured icon`,
        };
    }
    if (line.slug === 'rigid-boxes') {
        return {
            url: RIGID_BOXES_MOCK_FEATURED_ICON.src,
            alt: RIGID_BOXES_MOCK_FEATURED_ICON.alt,
        };
    }
    return {url: null, alt: `${line.title} featured icon`};
}

function resolveFeaturedVideo(line: ProductLine): string | null {
    const authored = line.featuredVideoUrl?.trim();
    if (authored) return authored;
    if (line.slug === 'rigid-boxes') return RIGID_BOXES_MOCK_FEATURED_VIDEO;
    return null;
}

function resolveHeroLayout(line: ProductLine): ProductLineHeroLayout {
    if (line.heroLayout === 'bottomBar' || line.heroLayout === 'stack') {
        return line.heroLayout;
    }
    // Local preview: rigid-boxes demos the bottom-bar carousel when no layout shell is set.
    if (line.slug === 'rigid-boxes') return 'bottomBar';
    return 'stack';
}

/**
 * Pure assembler for the product-line landing page (PROD-1914).
 * Sanity wins when a field is set; slug-keyed mock fills only blanks.
 */
export function assembleProductLineLanding(
    line: ProductLine,
): ProductLineLandingModel {
    const frames = resolveFrames(line);
    const heroMode = frames.length >= 2 ? 'sequence' : 'static';
    const heroLayout = resolveHeroLayout(line);
    const featured = resolveFeaturedImage(line);
    const featuredVideoUrl = resolveFeaturedVideo(line);
    const featuredIcon = resolveFeaturedIcon(line);

    const styles: ProductLineLandingStyleCard[] = line.styles.map((style) => {
        const {imageUrl, imageAlt} = resolveStyleCardImage(style, line);
        return {
            slug: style.slug,
            title: style.title,
            ...(style.shortDescription || style.description
                ? {
                      description:
                          style.shortDescription?.trim() ||
                          style.description?.trim(),
                  }
                : {}),
            imageUrl,
            imageAlt,
        };
    });

    const inheritStyleCards: PageSectionInspirationsCardDoc[] = styles.map(
        (style) => ({
            kind: 'ref',
            _type: 'productStyle',
            title: style.title,
            ...(style.description ? {description: style.description} : {}),
            ...(style.imageUrl ? {imageSrc: style.imageUrl} : {}),
            imageAlt: style.imageAlt,
            slug: style.slug,
            lineSlug: line.slug,
        }),
    );

    const featuredStudies = line.featuredStudies?.length
        ? line.featuredStudies
        : null;
    const faqs = line.faqs?.length ? line.faqs : null;

    const contentSections = line.sections ?? [];
    const templateSections = line.templateSections ?? [];
    const documentFaqs = faqs?.map((faq) => ({
        question: faq.question,
        answerPlain: faq.answerPlain,
        ...(faq.answer?.length ? {answer: faq.answer} : {}),
    }));
    const documentVideoStudies = featuredStudies
        ?.filter((study) => study.imageUrl?.trim())
        .map((study) => ({
            kind: 'ref' as const,
            title: study.title,
            brand: study.title,
            slug: study.slug,
            // Flat URL stub — no Studio hotspot on this inherit path.
            image: {url: study.imageUrl},
            imageAlt: study.imageAlt ?? study.title,
        }));
    const mergedSections =
        templateSections.length > 0
            ? mergeSolutionSections(
                  templateSections,
                  contentSections,
                  undefined,
                  documentFaqs,
                  undefined,
                  documentVideoStudies,
              )
            : contentSections;
    const pageSections = applySectionTokens(
        applyProductStylesInherit(mergedSections, inheritStyleCards),
        sectionTokenContextFromHost({
            title: line.title,
            h1: resolveH1(line),
            shortName: line.shortName,
            shortDescription: line.shortDescription,
            descriptionText: line.description,
            slug: line.slug,
        }),
    );

    return {
        slug: line.slug,
        title: line.title,
        h1: resolveH1(line),
        intro: resolveIntro(line),
        ...(line.metaTitle ? {metaTitle: line.metaTitle} : {}),
        ...(line.metaDescription
            ? {metaDescription: line.metaDescription}
            : {}),
        frames,
        heroMode,
        heroLayout,
        featuredImageUrl: featured.url,
        featuredImageAlt: featured.alt,
        featuredVideoUrl,
        featuredIconUrl: featuredIcon.url,
        featuredIconAlt: featuredIcon.alt,
        styles: styles.length > 0 ? styles : null,
        pageSections,
    };
}
