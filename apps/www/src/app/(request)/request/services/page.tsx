import type {Metadata} from 'next';
import {BriefBuilderLazy} from '@/components/request/brief-builder-lazy';

export const metadata: Metadata = {
    title: 'Service quote',
    robots: {index: false, follow: false},
};

export default function RequestServicesPage() {
    return <BriefBuilderLazy mode="services" />;
}
