import type {Metadata} from 'next';
import {BriefBuilderLazy} from '@/components/request/brief-builder-lazy';
import {listRequestServiceOptions} from '@/lib/request/service-options';

export const metadata: Metadata = {
    title: 'Service quote',
    robots: {index: false, follow: false},
};

export default async function RequestServicesPage() {
    const serviceOptions = await listRequestServiceOptions();
    return (
        <BriefBuilderLazy mode="services" serviceOptions={serviceOptions} />
    );
}
