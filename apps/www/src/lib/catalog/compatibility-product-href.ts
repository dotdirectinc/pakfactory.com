/**
 * Works with / compatibility → PDP handoff href (PROD-2921).
 */

import {ACHIEVED_BY_PROPERTY_KEY} from '@/lib/catalog/achieved-by-property';
import {
    withCompatibilityQuery,
    type CompatibilityPropertySelection,
} from '@/lib/catalog/compatibility-query';
import {productHref} from '@/lib/www-routes';

export type CompatibilityProductOption = {
    category: string;
    slug: string;
    /** Page technique slug when Apply comes from an Achieves rail. */
    achievedBySlug?: string;
};

/**
 * PDP URL with a single option in the shareable compatibility query.
 * Query stays on the PDP — the listener applies it without stripping.
 */
export function compatibilityProductHref(
    slug: string,
    option: CompatibilityProductOption | null | undefined,
    properties: CompatibilityPropertySelection[] = [],
): string {
    if (!option?.category?.trim() || !option?.slug?.trim()) {
        return productHref(slug);
    }
    const achievedBy = option.achievedBySlug?.trim();
    const nextProperties = [...properties];
    if (achievedBy) {
        nextProperties.push({
            category: option.category,
            optionSlug: option.slug,
            propertyKey: ACHIEVED_BY_PROPERTY_KEY,
            valueSlugs: [achievedBy],
        });
    }
    return withCompatibilityQuery(productHref(slug), {
        selections: [
            {category: option.category, optionSlug: option.slug},
        ],
        properties: nextProperties,
    });
}
