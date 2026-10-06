import type {CustomizationOption} from '@/lib/catalog/types';
import {customizationOptionHref} from '@/lib/catalog/customization-option-href';

export type CustomizationPreviewItem = {
    id: string;
    label: string;
    /** Detail page; absent when the option has none (PROD-2758) — render as a non-link. */
    href?: string;
    category: string;
    categoryTitle?: string;
    typeTitle?: string;
    description?: string;
    imageUrl?: string | null;
    imageAlt?: string;
};

const PREVIEW_LIMIT = 40;

/** Map catalog options → CDP-linked preview cards (PROD-1913). */
export function mapCustomizationPreviewItems(
    options: CustomizationOption[],
): CustomizationPreviewItem[] {
    const seen = new Set<string>();
    const items: CustomizationPreviewItem[] = [];

    for (const option of options) {
        const slug = option.slug?.trim();
        if (!slug || seen.has(option.id)) continue;
        seen.add(option.id);
        const href = customizationOptionHref({...option, slug});
        items.push({
            id: option.id,
            label: option.label,
            ...(href ? {href} : {}),
            category: option.category,
            categoryTitle: option.categoryTitle,
            typeTitle: option.typeTitle ?? option.categoryTitle,
            description:
                option.shortDescription || option.description || undefined,
            imageUrl: option.imageUrl,
            imageAlt: option.label,
        });
        if (items.length >= PREVIEW_LIMIT) break;
    }

    return items;
}
