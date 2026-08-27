import type { Metadata } from 'next';

import { CAPABILITY_CATEGORY_ENTRIES_QUERY } from '@pakfactory/sanity/queries';

import { PageBreadcrumbSection } from '@/components/common/page-breadcrumb-section';
import { PageHeadingSection } from '@/components/common/page-heading-section';
import {
    CapabilityCatalog,
    type CapabilityCatalogItem,
    type CapabilityCatalogTab,
} from '@/components/modules/capability-catalog';
import { getSanityClient } from '@/lib/sanity/client';
import { WWW_ROUTES } from '@/lib/www-routes';

export const metadata: Metadata = {
    title: 'Capabilities',
};

const TABS: CapabilityCatalogTab[] = [
    { label: 'Material', value: 'material' },
    { label: 'Finish', value: 'finish' },
];

export default async function CapabilitiesIndexPage() {
    const client = await getSanityClient();
    const items = await client.fetch<CapabilityCatalogItem[]>(CAPABILITY_CATEGORY_ENTRIES_QUERY);

    return (
        <>
            <PageBreadcrumbSection
                items={[
                    { label: 'Home', href: WWW_ROUTES.home },
                    { label: 'Capabilities' },
                ]}
            />
            <PageHeadingSection
                title="Capabilities"
                description="Materials and finishes available for your packaging."
            />
            <div className="mt-8">
                <CapabilityCatalog tabs={TABS} items={items ?? []} />
            </div>
        </>
    );
}
