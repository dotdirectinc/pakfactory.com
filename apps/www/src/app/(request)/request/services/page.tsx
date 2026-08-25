import type {Metadata} from 'next';
import {BriefBuilder} from '@/components/request/brief-builder';

export const metadata: Metadata = {
    title: 'Service quote',
    robots: {index: false, follow: false},
};

export default function RequestServicesPage() {
    return <BriefBuilder mode="services" />;
}
