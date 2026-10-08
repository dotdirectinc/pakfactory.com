/**
 * Works with / compatibility → PDP handoff href (PROD-2921).
 */

import {withCompatibilityQuery} from '@/lib/catalog/compatibility-query';
import {productHref} from '@/lib/www-routes';

/**
 * PDP URL with a single option in the shareable compatibility query.
 * Query stays on the PDP — the listener applies it without stripping.
 */
export function compatibilityProductHref(
    slug: string,
    option: {category: string; slug: string},
): string {
    return withCompatibilityQuery(productHref(slug), {
        selections: [
            {category: option.category, optionSlug: option.slug},
        ],
        properties: [],
    });
}
