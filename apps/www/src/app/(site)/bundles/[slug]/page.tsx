import type {Metadata} from 'next';
import {
    ComingSoonPage,
    comingSoonMetadata,
} from '@/components/common/coming-soon-page';

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    const {slug} = await params;
    return comingSoonMetadata(`Bundle · ${slug}`);
}

export default async function BundleDetailPage({params}: PageProps) {
    const {slug} = await params;
    return (
        <ComingSoonPage
            title={slug.replace(/-/g, ' ')}
            note="This bundle page is reserved. Content is coming soon."
        />
    );
}
