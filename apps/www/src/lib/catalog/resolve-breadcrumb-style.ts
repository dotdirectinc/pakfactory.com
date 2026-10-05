import type {
    CatalogProductDoc,
    SolutionStyleBreadcrumbDoc,
    SolutionStylesForBreadcrumbDoc,
} from '@pakfactory/sanity/queries';
import {
    filterParams,
    productMatchesSolutionStyleFilter,
} from '@pakfactory/sanity/solution-style-filter';

/**
 * Pick the first merchandised Solution Style whose filter matches this product
 * (PROD-2763 inspiration PDP crumbs). Styles must already be in merchandised order.
 */
export function pickBreadcrumbSolutionStyle(
    doc: CatalogProductDoc,
    solutionId: string,
    styles: SolutionStyleBreadcrumbDoc[],
): {title: string; slug: string} | null {
    const product = {
        id: doc._id.replace(/^drafts\./, ''),
        kind: doc.kind ?? 'standard',
        title: doc.title,
        solutionIds: (doc.solutionIds ?? []).filter(
            (id): id is string => Boolean(id),
        ),
        lineId: doc.productLineId?.trim() || doc.productLine?._id || null,
        styleIds: (doc.productStyleIds ?? []).filter(
            (id): id is string => Boolean(id),
        ),
        status: doc.status ?? null,
    };

    for (const style of styles) {
        const slug = style.slug?.trim();
        if (!slug) continue;
        const params = filterParams(
            solutionId,
            style.filter ?? undefined,
            style.excludedProducts ?? undefined,
        );
        if (!productMatchesSolutionStyleFilter(product, params)) continue;

        const title =
            style.shortName?.trim() || style.title?.trim() || slug;
        return {title, slug};
    }
    return null;
}

/** Resolve breadcrumb style from a fetched styles-for-breadcrumb bundle. */
export function breadcrumbStyleFromBundle(
    doc: CatalogProductDoc,
    bundle: SolutionStylesForBreadcrumbDoc | null | undefined,
): {title: string; slug: string} | null {
    if (!bundle?._id) return null;
    const styles = (bundle.styles ?? []).filter(
        (s): s is SolutionStyleBreadcrumbDoc => Boolean(s?._id),
    );
    return pickBreadcrumbSolutionStyle(doc, bundle._id, styles);
}
