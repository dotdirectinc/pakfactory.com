import {CustomizationCatalogView} from '@/components/customization/customization-catalog-view';
import {listCustomizations} from '@/lib/catalog/catalog';

export type CustomizationsCatalogSectionProps = {
    heading?: string | null;
    intro?: string | null;
    /** Sanity customizationCategory.slug — opens that tab when set. */
    defaultCategorySlug?: string | null;
};

/**
 * Studio `customizationsCatalog` section renderer (PROD-1288).
 * Reuses the same catalog stack as `/customizations` with local filter state
 * (no URL sync) so it does not fight the host page query string.
 *
 * Distinct from `customizationsRow` (catalogue strip).
 */
export async function CustomizationsCatalogSection({
    heading,
    intro,
    defaultCategorySlug = null,
}: CustomizationsCatalogSectionProps) {
    const library = await listCustomizations();

    return (
        <CustomizationCatalogView
            library={library}
            urlSync={false}
            showPageChrome={false}
            heading={heading}
            intro={intro}
            initialCategory={defaultCategorySlug}
        />
    );
}
