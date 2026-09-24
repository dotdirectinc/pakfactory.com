import type {PageSectionDoc} from '@pakfactory/sanity/queries';

import type {
    Product,
    ProductFaq,
    ProductLine,
    ProductLineCaseStudyRef,
    ProductLineExpertiseRef,
    ProductLineFrame,
    ProductLineRelatedRef,
    ProductStyleRef,
} from '@/lib/catalog/types';
import {mergeSolutionSections} from '@/lib/sections/merge-solution-sections';

/** Storyboard H1 for rigid-boxes when Sanity `h1` is empty (PROD-1914). */
export const RIGID_BOXES_MOCK_H1 = 'Made to be kept.';

/**
 * Placeholder intro until design supplies copy. Used only when both
 * description and shortDescription are empty on rigid-boxes.
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

/** Kit-mark icon until Studio supplies a product-line mark asset. */
export const RIGID_BOXES_MOCK_KIT_MARK: ProductLineFrame = {
    src: '/products/rigid-boxes/kit-mark.png',
    alt: 'Rigid box dieline mark',
};

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
    featuredImageUrl: string | null;
    featuredImageAlt: string;
    /** Kit-mark icon above the H1; Sanity wins, mock fills blanks for rigid-boxes. */
    kitMarkUrl: string | null;
    kitMarkAlt: string;
    styles: ProductLineLandingStyleCard[] | null;
    expertise: ProductLineExpertiseRef[] | null;
    featuredStudies: ProductLineCaseStudyRef[] | null;
    faqs: ProductFaq[] | null;
    relatedLines: ProductLineRelatedRef[] | null;
    /**
     * Merged Product Line Page template × line sections (order/chrome × content).
     * Empty when neither template nor line has sections.
     */
    pageSections: PageSectionDoc[];
    /** No line field yet. */
    logos: null;
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
    const fromDescription = line.description?.trim();
    if (fromDescription) return fromDescription;
    const fromShort = line.shortDescription?.trim();
    if (fromShort) return fromShort;
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

function resolveKitMark(line: ProductLine): {url: string | null; alt: string} {
    const authored = line.kitMarkUrl?.trim();
    if (authored) {
        return {
            url: authored,
            alt: line.kitMarkAlt?.trim() || `${line.title} kit mark`,
        };
    }
    if (line.slug === 'rigid-boxes') {
        return {
            url: RIGID_BOXES_MOCK_KIT_MARK.src,
            alt: RIGID_BOXES_MOCK_KIT_MARK.alt,
        };
    }
    return {url: null, alt: `${line.title} kit mark`};
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
    const featured = resolveFeaturedImage(line);
    const kitMark = resolveKitMark(line);

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

    const expertise = line.expertise?.length ? line.expertise : null;
    const featuredStudies = line.featuredStudies?.length
        ? line.featuredStudies
        : null;
    const faqs = line.faqs?.length ? line.faqs : null;
    const relatedLines = line.relatedLines?.length ? line.relatedLines : null;

    const contentSections = line.sections ?? [];
    const templateSections = line.templateSections ?? [];
    const pageSections =
        templateSections.length > 0
            ? mergeSolutionSections(templateSections, contentSections)
            : contentSections;

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
        featuredImageUrl: featured.url,
        featuredImageAlt: featured.alt,
        kitMarkUrl: kitMark.url,
        kitMarkAlt: kitMark.alt,
        styles: styles.length > 0 ? styles : null,
        expertise,
        featuredStudies,
        faqs,
        relatedLines,
        pageSections,
        logos: null,
    };
}
