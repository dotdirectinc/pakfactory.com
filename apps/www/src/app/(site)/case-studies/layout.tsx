import type {Metadata} from 'next';
import {robotsDirectiveToMetadata} from '@/lib/seo';

export function generateMetadata(): Metadata {
    return {
        robots: robotsDirectiveToMetadata({index: true, follow: true}),
    };
}

export default function CaseStudiesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
