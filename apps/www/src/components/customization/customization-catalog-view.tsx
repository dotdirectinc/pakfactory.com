import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {CustomizationCatalogPanel} from '@/components/customization/customization-catalog-panel';
import type {CustomizationCardData} from '@/components/customization/customization-card';
import {WWW_ROUTES} from '@/lib/www-routes';

export type CustomizationCatalogTab = {
    label: string;
    value: string;
};

type CustomizationCatalogViewProps = {
    tabs: CustomizationCatalogTab[];
    items: CustomizationCardData[];
};

export function CustomizationCatalogView({
    tabs,
    items,
}: CustomizationCatalogViewProps) {
    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Customization'},
                ]}
            />
            <PageHeadingSection
                title="Customization"
                description="Materials and finishes available for your packaging."
            />
            <CustomizationCatalogPanel tabs={tabs} items={items} />
        </>
    );
}
