import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {SolutionLineCatalogView} from '@/components/solution/solution-views';
import {
    getSolutionLineCatalog,
    listSolutionPageSlugs,
} from '@/lib/solutions/solutions';
import {absoluteUrl} from '@/lib/site';
import {WWW_CATALOG_REVALIDATE_SECONDS} from '@/lib/www-cache';
import {solutionLineHref} from '@/lib/www-routes';

export const revalidate = WWW_CATALOG_REVALIDATE_SECONDS;

type PageProps = {
    params: Promise<{slug: string; lineSlug: string}>;
};

export async function generateStaticParams(): Promise<
    {slug: string; lineSlug: string}[]
> {
    const pages = await listSolutionPageSlugs();
    return pages.flatMap((page) =>
        page.lineSlugs.map((lineSlug) => ({
            slug: page.slug,
            lineSlug,
        })),
    );
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const {slug, lineSlug} = await params;
    const catalog = await getSolutionLineCatalog(slug, lineSlug);
    if (!catalog) return {title: 'Solution'};

    const title = `${catalog.line.title} · ${catalog.solution.shortName}`;
    const description = `Browse ${catalog.line.title} packaging for ${catalog.solution.shortName}.`;
    const canonical = absoluteUrl(
        solutionLineHref(catalog.solution.slug, catalog.line.slug),
    );
    const globalNoIndex = process.env.WWW_DISABLE_INDEXING === 'true';

    return {
        title,
        description,
        alternates: {canonical},
        robots: {
            index: !globalNoIndex && catalog.solution.allowIndex,
            follow: catalog.solution.allowFollow,
        },
    };
}

export default async function SolutionLineCatalogPage({params}: PageProps) {
    const {slug, lineSlug} = await params;
    const catalog = await getSolutionLineCatalog(slug, lineSlug);
    if (!catalog) notFound();
    return <SolutionLineCatalogView catalog={catalog} />;
}
