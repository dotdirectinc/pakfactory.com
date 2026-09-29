import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {Suspense} from 'react';

import {SectionRenderer} from '@/components/sections/section-renderer';
import type {PageSection} from '@/components/sections/registry';
import {ProductCatalogPanelLoading} from '@/components/product/product-catalog-page-loading';
import {ProductCatalogView} from '@/components/product/product-catalog-view';
import {ProductStyleChrome} from '@/components/product/product-style-view';
import {
    getProductStylePage,
    getStyle,
    listLines,
    listProductStyleLibrary,
} from '@/lib/catalog/catalog';
import {resolveStyleFaqs} from '@/lib/catalog/faq-inheritance';
import type {ProductLine, ProductStyleRef} from '@/lib/catalog/types';
import {applyFaqInherit} from '@/lib/sections/merge-solution-sections';

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

async function ProductStyleCatalogBody({
    line,
    style,
}: {
    line: ProductLine;
    style: ProductStyleRef;
}) {
    const [library, page] = await Promise.all([
        listProductStyleLibrary(line.slug, style.slug),
        getProductStylePage(line.slug, style.slug),
    ]);
    // The template's FAQ section (listSource page) fills from the style, else its line.
    const sections = page?.sections
        ? (applyFaqInherit(page.sections, resolveStyleFaqs(style, line)) as PageSection[])
        : null;

    return (
        <>
            <ProductCatalogView
                library={library}
                urlSync
                showPageChrome={false}
                hideCatalogBorderTop
            />
            <SectionRenderer sections={sections} />
        </>
    );
}

export default async function ProductStylePage({params}: PageProps) {
    const {slug, styleSlug} = await params;
    const match = await getStyle(slug, styleSlug);
    if (!match) notFound();

    return (
        <>
            <ProductStyleChrome line={match.line} style={match.style} />
            <Suspense fallback={<ProductCatalogPanelLoading />}>
                <ProductStyleCatalogBody
                    line={match.line}
                    style={match.style}
                />
            </Suspense>
        </>
    );
}
