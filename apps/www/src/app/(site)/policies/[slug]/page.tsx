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
    return comingSoonMetadata(`Policy · ${slug}`);
}

export default async function PolicyDetailPage({params}: PageProps) {
    const {slug} = await params;
    return (
        <ComingSoonPage
            title={slug.replace(/-/g, ' ')}
            note="This policy page is reserved. Content is coming soon."
        />
    );
}
