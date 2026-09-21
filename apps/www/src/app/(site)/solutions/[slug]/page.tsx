import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {SolutionLandingView} from '@/components/solution/solution-views';
import {BEAUTY_COSMETICS_SLUG} from '@/lib/solutions/fixtures/beauty-cosmetics';
import {
    getSolutionLandingContent,
    listSolutionPageSlugs,
} from '@/lib/solutions/solutions';
import {absoluteUrl} from '@/lib/site';
import {solutionHref} from '@/lib/www-routes';

export const revalidate = 60;

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateStaticParams(): Promise<{slug: string}[]> {
    const pages = await listSolutionPageSlugs();
    const slugs = new Set(pages.map((page) => page.slug));
    // Fixture LP so beauty is always buildable before Sanity hasPage lands.
    slugs.add(BEAUTY_COSMETICS_SLUG);
    return [...slugs].map((slug) => ({slug}));
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const {slug} = await params;
    const content = await getSolutionLandingContent(slug);
    if (!content) return {title: 'Solution'};

    const {solution} = content;
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
    const content = await getSolutionLandingContent(slug);
    if (!content) notFound();
    return <SolutionLandingView content={content} />;
}
