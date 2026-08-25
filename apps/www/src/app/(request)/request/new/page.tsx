import type {Metadata} from 'next';
import {BriefBuilder} from '@/components/request/brief-builder';

export const metadata: Metadata = {
    title: 'Get a quote',
    robots: {index: false, follow: false},
};

export default function RequestNewPage() {
    return <BriefBuilder mode="express" />;
}
