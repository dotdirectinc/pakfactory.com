import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {SolutionStyleCatalogView} from '@/components/solution/solution-views';
import {
    getSolutionStyleCatalog,
    listSolutionStylePageParams,
} from '@/lib/solutions/solutions';
import {absoluteUrl} from '@/lib/site';
import {solutionStyleHref} from '@/lib/www-routes';

export const revalidate = 60;

type PageProps = {
    params: Promise<{slug: string; styleSlug: string}>;
};

export async function generateStaticParams(): Promise<
    {slug: string; styleSlug: string}[]
> {
    return listSolutionStylePageParams();
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const {slug, styleSlug} = await params;
    const catalog = await getSolutionStyleCatalog(slug, styleSlug);
    if (!catalog) return {title: 'Solution'};

    const {solution, style} = catalog;
    const title =
        style.metaTitle || `${style.h1} · ${solution.shortName}`;
    const description =
        style.metaDescription ||
        style.shortDescription ||
        style.descriptionText ||
        undefined;
    const canonical =
        style.canonicalUrl ||
        absoluteUrl(solutionStyleHref(solution.slug, style.slug));
    const globalNoIndex = process.env.WWW_DISABLE_INDEXING === 'true';

    return {
        title,
        description,
        alternates: {canonical},
        robots: {
            index: !globalNoIndex && style.allowIndex && solution.allowIndex,
            follow: style.allowFollow && solution.allowFollow,
            nocache: false,
            googleBot: {
                index: !globalNoIndex && style.allowIndex && solution.allowIndex,
                follow: style.allowFollow && solution.allowFollow,
                'max-image-preview': style.noImageIndex ? 'none' : 'large',
            },
        },
    };
}

export default async function SolutionStyleCatalogPage({params}: PageProps) {
    const {slug, styleSlug} = await params;
    const catalog = await getSolutionStyleCatalog(slug, styleSlug);
    if (!catalog) notFound();
    return <SolutionStyleCatalogView catalog={catalog} />;
}
