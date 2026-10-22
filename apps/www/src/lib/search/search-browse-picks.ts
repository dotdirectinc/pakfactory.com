import type {SiteSearchRecord} from '@pakfactory/sanity/algolia/site-search';

import {WWW_ROUTES} from '@/lib/www-routes';

import {resolveHref} from './search-query';

/**
 * Pure picking rules for the ⌘K dialog's browse tabs (PROD-3111); the reads
 * live in `search-browse-data.ts`. Kept apart so they are unit-tested.
 */

export const BROWSE_PRODUCT_LINES = 8;
export const BROWSE_OPTIONS_PER_CATEGORY = 2;

export type BrowseItem = {
    id: string;
    type: string;
    title: string;
    href: string;
    image: string | null;
    imageAlt: string;
    /** Product `images[1]` when the browse pick is a product (PROD-3130). */
    hoverImage?: string | null;
    summary: string;
};

export type BrowseLink = {label: string; href: string};

export type SearchBrowseData = {
    productLines: BrowseProductLine[];
    products: BrowseItem[];
    solutions: BrowseItem[];
    customizationCategories: BrowseLink[];
    customizations: BrowseItem[];
    guides: BrowseItem[];
    caseStudies: BrowseItem[];
    pressReleases: BrowseItem[];
    expertise: BrowseItem[];
};

export function toBrowseItem(record: SiteSearchRecord, blogUrl: string): BrowseItem | null {
    if (!record.href || !record.title) return null;
    return {
        id: record.objectID,
        type: record.type,
        title: record.title,
        href: resolveHref(record.href, blogUrl),
        image: record.image ?? null,
        imageAlt: record.imageAlt ?? '',
        ...(record.hoverImage ? {hoverImage: record.hoverImage} : {}),
        summary: record.summary ?? '',
    };
}

export const toBrowseItems = (records: SiteSearchRecord[] | null | undefined, blogUrl: string) =>
    (records ?? [])
        .map((record) => toBrowseItem(record, blogUrl))
        .filter((item): item is BrowseItem => item !== null);

/** `/customizations/{category}/{slug}` → `{category}`. */
function categoryOf(href: string): string | null {
    const match = /^\/customizations\/([^/]+)\/[^/]+$/.exec(href);
    return match ? match[1]! : null;
}

export function pickCustomizations(
    records: SiteSearchRecord[],
    blogUrl: string,
): {
    categories: BrowseLink[];
    options: BrowseItem[];
} {
    const byCategory = new Map<string, {label: string; options: BrowseItem[]}>();
    for (const record of records) {
        const item = toBrowseItem(record, blogUrl);
        const slug = item ? categoryOf(item.href) : null;
        if (!item || !slug) continue;
        // parents = [option type, category] (site_search projection).
        const label = record.parents?.[1] ?? slug;
        const entry = byCategory.get(slug) ?? {label, options: []};
        if (entry.options.length < BROWSE_OPTIONS_PER_CATEGORY) entry.options.push(item);
        byCategory.set(slug, entry);
    }
    const sorted = [...byCategory.entries()].sort(([, a], [, b]) => a.label.localeCompare(b.label));
    return {
        categories: sorted.map(([slug, {label}]) => ({
            label,
            href: `${WWW_ROUTES.customizations}?category=${encodeURIComponent(slug)}`,
        })),
        options: sorted.flatMap(([, {options}]) => options),
    };
}

/** One product line as the browse query returns it. */
export type BrowseLine = {
    record: SiteSearchRecord;
    shortName: string | null;
    /** Products under the line that search would show. */
    productCount: number;
    /** The line's first such product with an image (title order). */
    firstProduct: SiteSearchRecord | null;
};

export type BrowseProductLine = {
    title: string;
    href: string;
    image: string | null;
    imageAlt: string;
};

/** The product-lines row: every line search would show, with its own or its first product's image. */
export function pickProductLines(lines: BrowseLine[]): BrowseProductLine[] {
    return lines
        .filter((line) => line.record.href && line.record.title)
        .map((line) => ({
            title: line.shortName || line.record.title,
            href: line.record.href,
            image: line.record.image ?? null,
            imageAlt: line.record.imageAlt || line.record.title,
        }));
}

/** The Products tab: the biggest lines first, each line's first product with an image. */
export function pickProducts(lines: BrowseLine[], blogUrl: string): BrowseItem[] {
    return lines
        .filter((line) => line.firstProduct)
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, BROWSE_PRODUCT_LINES)
        .map((line) => toBrowseItem(line.firstProduct!, blogUrl))
        .filter((item): item is BrowseItem => item !== null);
}
