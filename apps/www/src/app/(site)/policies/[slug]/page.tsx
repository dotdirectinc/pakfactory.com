import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {LegalPageView} from '@/components/legal/legal-page-view';
import {
    getLegalPageBySlug,
    isLegalPageSlug,
    LEGAL_PAGE_SLUG_TO_ID,
} from '@/lib/legal-pages';
import {robotsDirectiveToMetadata} from '@/lib/seo';
import {staticParamsExceptPreview} from '@/lib/static-params';

export const revalidate = 60;

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateStaticParams(): Promise<{slug: string}[]> {
    return staticParamsExceptPreview(async () =>
        Object.keys(LEGAL_PAGE_SLUG_TO_ID).map((slug) => ({slug})),
    );
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const {slug} = await params;
    const page = await getLegalPageBySlug(slug);
    if (!page) {
        return {title: 'Policy'};
    }
    const title = page.metaTitle?.trim() || page.title?.trim() || 'Policy';
    const description = page.metaDescription?.trim() || undefined;
    return {
        title,
        ...(description ? {description} : {}),
        robots: robotsDirectiveToMetadata({
            index: page.allowIndex !== false,
            follow: page.allowFollow !== false,
        }),
    };
}

export default async function PolicyDetailPage({params}: PageProps) {
    const {slug} = await params;
    if (!isLegalPageSlug(slug)) notFound();
    const page = await getLegalPageBySlug(slug);
    if (!page) notFound();
    return <LegalPageView page={page} />;
}
