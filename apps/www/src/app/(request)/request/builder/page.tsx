import type {Metadata} from 'next';
import {BriefBuilder} from '@/components/request/brief-builder';

export const metadata: Metadata = {
    title: 'Product quote',
    robots: {index: false, follow: false},
};

export default function RequestBuilderPage() {
    return <BriefBuilder mode="products" />;
}
