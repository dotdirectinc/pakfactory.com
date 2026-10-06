import {hasDetailPage} from '@/lib/catalog/types';
import {customizationCategoryHref} from '@/lib/www-routes';

type LinkableOption = {
    category?: string | null;
    slug?: string | null;
    appearsIn?: string | null;
    status?: string | null;
};

/**
 * Detail-page URL for a customization option, or `undefined` when it has no page
 * (PROD-2758). Mirrors the gate in `CATALOG_CUSTOMIZATION_DETAIL_QUERY`: a page
 * exists only for a page-bearing `appearsIn` with `status == "active"`. Options
 * such as `configurable-no-page` materials are configurator-only, and linking them
 * produced 404s — callers render them as non-links (or fall back to the listing).
 */
export function customizationOptionHref(
    option: LinkableOption,
): string | undefined {
    const category = option.category?.trim();
    const slug = option.slug?.trim();
    if (!category || !slug) return undefined;
    if (!hasDetailPage(option.appearsIn) || option.status !== 'active') {
        return undefined;
    }
    return customizationCategoryHref(category, slug);
}
