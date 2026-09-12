import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {SolutionLandingView} from '@/components/solution/solution-views';
import {
    getSolutionBySlug,
    listSolutionPageSlugs,
} from '@/lib/solutions/solutions';
import {absoluteUrl} from '@/lib/site';
import {WWW_CATALOG_REVALIDATE_SECONDS} from '@/lib/www-cache';
import {solutionHref} from '@/lib/www-routes';

export const revalidate = WWW_CATALOG_REVALIDATE_SECONDS;

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateStaticParams(): Promise<{slug: string}[]> {
    const pages = await listSolutionPageSlugs();
    return pages.map((page) => ({slug: page.slug}));
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const {slug} = await params;
    const solution = await getSolutionBySlug(slug);
    if (!solution) return {title: 'Solution'};

    const title = solution.metaTitle || solution.h1;
    const description =
        solution.metaDescription || solution.shortDescription || undefined;
    const canonical =
        solution.canonicalUrl || absoluteUrl(solutionHref(solution.slug));
    const globalNoIndex = process.env.WWW_DISABLE_INDEXING === 'true';

    return {
        title,
        description,
        alternates: {canonical},
        robots: {
            index: !globalNoIndex && solution.allowIndex,
            follow: solution.allowFollow,
            nocache: false,
            googleBot: {
                index: !globalNoIndex && solution.allowIndex,
                follow: solution.allowFollow,
                'max-image-preview': solution.noImageIndex
                    ? 'none'
                    : 'large',
            },
        },
    };
}

export default async function SolutionDetailPage({params}: PageProps) {
    const {slug} = await params;
    const solution = await getSolutionBySlug(slug);
    if (!solution) notFound();
    return <SolutionLandingView solution={solution} />;
}
