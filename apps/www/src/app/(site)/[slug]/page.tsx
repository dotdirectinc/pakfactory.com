import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ContentPageView} from '@/components/content/content-page-view';
import {contentPageMetadata} from '@/lib/content-page-metadata';
import {
    getContentPageBySlug,
    listContentPageSlugs,
} from '@/lib/content-pages';
import {staticParamsExceptPreview} from '@/lib/static-params';

export const revalidate = 60;

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateStaticParams(): Promise<{slug: string}[]> {
    return staticParamsExceptPreview(async () => {
        const slugs = await listContentPageSlugs();
        return slugs.map((slug) => ({slug}));
    });
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const {slug} = await params;
    const page = await getContentPageBySlug(slug);
    if (!page) {
        return {title: 'Page'};
    }
    return contentPageMetadata(page);
}

/**
 * Slugged Content Pages (e.g. Sustainability). Specific folders such as
 * `/about` and `/products` win over this segment.
 */
export default async function ContentPageBySlug({params}: PageProps) {
    const {slug} = await params;
    const page = await getContentPageBySlug(slug);
    if (!page) notFound();
    return <ContentPageView page={page} />;
}
