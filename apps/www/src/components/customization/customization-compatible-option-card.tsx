import {CatalogCard} from '@/components/ui/catalog-card';
import type {CustomizationCompatibleOption} from '@/lib/catalog/types';
import {customizationCategoryHref} from '@/lib/www-routes';

type CustomizationCompatibleOptionCardProps = {
    option: CustomizationCompatibleOption;
};

/**
 * Discovery card for a compatible customization (PROD-3124).
 * General CatalogCard — not CustomizationCard (no bookmark/compare) and
 * not a product card.
 */
export function CustomizationCompatibleOptionCard({
    option,
}: CustomizationCompatibleOptionCardProps) {
    const title = option.shortName?.trim() || option.title;

    return (
        <CatalogCard
            href={customizationCategoryHref(option.categoryValue, option.slug)}
            eyebrow={option.typeTitle}
            title={title}
            description={option.shortDescription}
            imageSrc={option.imageUrl}
            imageAlt={option.imageAlt ?? title}
            align="left"
            size="sm"
            surface="elevated"
            ctaLabel={null}
        />
    );
}
