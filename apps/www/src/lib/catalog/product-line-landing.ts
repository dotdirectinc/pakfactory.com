import type {PageSectionDoc, PageSectionInspirationsCardDoc} from '@pakfactory/sanity/queries';

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
import type {SolutionHeroCustomization} from '@/lib/solutions/types';
import {productHref, WWW_ROUTES} from '@/lib/www-routes';

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
 * Used by bottomBar marquee hover-play (not stack).
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

/** Card for the bottomBar hero media marquee. */
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
    customizations?: SolutionHeroCustomization[];
};

/**
 * Temporary marquee density so a short catalog still scrolls.
 * Remove or gate when authored product counts are enough.
 */
const HERO_MEDIA_CARD_DUPLICATE = 6;

function mapHeroCustomizations(
    product: Product,
): SolutionHeroCustomization[] {
    return (product.availableCustomizations ?? []).slice(0, 4).map((opt) => ({
        id: opt.id || opt.slug || opt.label,
        category: (
            opt.categoryTitle ||
            opt.category ||
            'CUSTOMIZATION'
        ).toUpperCase(),
        title: opt.label,
        description:
            opt.shortDescription?.trim() ||
            'Available on this product.',
        learnMoreHref: WWW_ROUTES.customizations,
    }));
}

function duplicateHeroCards(
    unique: ProductLineHeroMediaCard[],
): ProductLineHeroMediaCard[] {
    if (unique.length === 0) return [];
    const cards: ProductLineHeroMediaCard[] = [];
    for (let copy = 0; copy < HERO_MEDIA_CARD_DUPLICATE; copy += 1) {
        for (const card of unique) {
            cards.push({
                ...card,
                id: `${card.id}-${copy}`,
            });
        }
    }
    return cards;
}

/**
 * Build bottomBar marquee cards.
 * Prefer `standard` products on the line (with media); fall back to featured
 * image + frames. Duplicates the unique list for scroll density.
 */
export function assembleHeroMediaCards(input: {
    featuredImageUrl: string | null;
    featuredImageAlt: string;
    featuredVideoUrl: string | null;
    frames: ProductLineFrame[];
    products?: Product[];
}): ProductLineHeroMediaCard[] {
    const videoUrl = input.featuredVideoUrl?.trim() || '';
    const unique: ProductLineHeroMediaCard[] = [];

    const fromProducts = (input.products ?? []).filter(
        (product) =>
            product.kind === 'standard' &&
            Boolean(
                product.media?.some((m) => Boolean(m.src?.trim())),
            ),
    );

    for (const product of fromProducts) {
        const media = product.media.find((m) => Boolean(m.src?.trim()));
        if (!media?.src?.trim()) continue;
        const productVideo = product.featuredVideoUrl?.trim() || '';
        unique.push({
            id: product.slug,
            src: media.src.trim(),
            alt: media.alt?.trim() || product.title,
            settleIndex: unique.length,
            title: product.title,
            detailHref: productHref(product.slug),
            customizations: mapHeroCustomizations(product),
            ...(productVideo ? {videoUrl: productVideo} : {}),
        });
    }

    if (unique.length === 0) {
        const seen = new Set<string>();
        const push = (
            src: string | null | undefined,
            alt: string,
            id: string,
        ) => {
            const url = src?.trim();
            if (!url || seen.has(url)) return;
            seen.add(url);
            unique.push({
                id,
                src: url,
                alt: alt.trim() || 'Product media',
                settleIndex: unique.length,
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
        if (videoUrl && unique[0]) {
            unique[0] = {...unique[0], videoUrl};
        }
    }

    if (unique.length === 0) return [];

    return duplicateHeroCards(unique);
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
     * Hero MP4 for bottomBar marquee hover-play on the featured card.
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
 * Style card image: style image → first product image in that style.
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
    // Local preview: rigid-boxes demos the bottom-bar marquee when no layout shell is set.
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
            imageSrc: study.imageUrl,
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
