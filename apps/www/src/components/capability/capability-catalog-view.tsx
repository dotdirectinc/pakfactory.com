import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {CapabilityCatalogPanel} from '@/components/capability/capability-catalog-panel';
import {WWW_ROUTES} from '@/lib/www-routes';

export type CapabilityCatalogTab = {
    label: string;
    value: 'material' | 'finish';
};

/** One Sanity `capabilityCategory` row for the landing grid. */
export type CapabilityCatalogItem = {
    _id: string;
    title: string;
    slug: string;
    category: 'material' | 'finish';
    imageUrl?: string | null;
    imageAlt?: string | null;
};

type CapabilityCatalogViewProps = {
    tabs: CapabilityCatalogTab[];
    items: CapabilityCatalogItem[];
};

export function CapabilityCatalogView({
    tabs,
    items,
}: CapabilityCatalogViewProps) {
    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Capabilities'},
                ]}
            />
            <PageHeadingSection
                title="Capabilities"
                description="Materials and finishes available for your packaging."
            />
            <CapabilityCatalogPanel tabs={tabs} items={items} />
        </>
    );
}
