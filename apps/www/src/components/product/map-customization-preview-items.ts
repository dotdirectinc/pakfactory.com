import type {CustomizationOption} from '@/lib/catalog/types';
import {customizationCategoryHref} from '@/lib/www-routes';

export type CustomizationPreviewItem = {
    label: string;
    href: string;
    category: string;
    categoryTitle?: string;
    typeTitle?: string;
    description?: string;
    imageUrl?: string | null;
    imageAlt?: string;
};

const PREVIEW_LIMIT = 24;

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
        items.push({
            label: option.label,
            href: customizationCategoryHref(option.category, slug),
            category: option.category,
            categoryTitle: option.categoryTitle,
            typeTitle: option.typeTitle ?? option.categoryTitle,
            description: option.description || option.shortDescription || undefined,
            imageUrl: option.imageUrl,
            imageAlt: option.label,
        });
        if (items.length >= PREVIEW_LIMIT) break;
    }

    return items;
}
