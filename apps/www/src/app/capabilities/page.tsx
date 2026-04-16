import type { Metadata } from 'next';

import { CAPABILITY_CATEGORY_ENTRIES_QUERY } from '@pakfactory/sanity/queries';

import {
    CapabilityCatalog,
    type CapabilityCatalogItem,
    type CapabilityCatalogTab,
} from '@/components/capabilities/capability-catalog';
import SectionHeader from '@/components/products/section-header';
import { getSanityClient } from '@/sanity/client';

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
            <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
                <SectionHeader
                    title="Capabilities"
                    description="Materials and finishes available for your packaging."
                />
            </div>
            <div className="mt-8">
                <CapabilityCatalog tabs={TABS} items={items ?? []} />
            </div>
        </>
    );
}
