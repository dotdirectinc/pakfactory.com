import type {Metadata} from 'next';
import {notFound} from 'next/navigation';

import {SectionRenderer} from '@/components/sections/section-renderer';
import type {PageSection} from '@/components/sections/registry';
import {ProductStyleView} from '@/components/product/product-style-view';
import {
    getProductStylePage,
    getStyle,
    listLines,
    listProductStyleLibrary,
} from '@/lib/catalog/catalog';

export const revalidate = 60;

type PageProps = {
    params: Promise<{slug: string; styleSlug: string}>;
};

export async function generateStaticParams(): Promise<
    {slug: string; styleSlug: string}[]
> {
    const lines = await listLines();
    return lines.flatMap((line) =>
        line.styles.map((style) => ({slug: line.slug, styleSlug: style.slug})),
    );
}

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    const {slug, styleSlug} = await params;
    const match = await getStyle(slug, styleSlug);
    if (!match) return {title: 'Product style'};
    return {
        title: `${match.style.title} · ${match.line.title}`,
        description:
            match.style.shortDescription ||
            match.style.description ||
            `${match.style.title} packaging in ${match.line.title}.`,
    };
}

export default async function ProductStylePage({params}: PageProps) {
    const {slug, styleSlug} = await params;
    const match = await getStyle(slug, styleSlug);
    if (!match) notFound();

    const [library, page] = await Promise.all([
        listProductStyleLibrary(match.line.slug, match.style.slug),
        getProductStylePage(),
    ]);
    const sections = (page?.sections ?? null) as PageSection[] | null;

    return (
        <>
            <ProductStyleView
                line={match.line}
                style={match.style}
                library={library}
            />
            <SectionRenderer sections={sections} />
        </>
    );
}
