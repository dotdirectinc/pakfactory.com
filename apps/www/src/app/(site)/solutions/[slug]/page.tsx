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
    return comingSoonMetadata(`Solution · ${slug}`);
}

export default async function SolutionDetailPage({params}: PageProps) {
    const {slug} = await params;
    return (
        <ComingSoonPage
            title={slug.replace(/-/g, ' ')}
            note="This solution landing page is reserved. Content is coming soon."
        />
    );
}
