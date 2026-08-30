import type {Metadata} from 'next';

import {
    CapabilityCatalogView,
    type CapabilityCatalogTab,
} from '@/components/capability/capability-catalog-view';

export const metadata: Metadata = {
    title: 'Capabilities',
};

const TABS: CapabilityCatalogTab[] = [
    {label: 'Material', value: 'material'},
    {label: 'Finish', value: 'finish'},
];

export default function CapabilitiesIndexPage() {
    return <CapabilityCatalogView tabs={TABS} items={[]} />;
}
