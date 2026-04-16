import type {PortableTextBlock} from '@portabletext/types';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {cache} from 'react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@pakfactory/ui/components/breadcrumb';
import HeroSection from '@/components/products/hero-section-01';
import ProductCollectionList from '@/components/products/product-collection-list';
import {plainTextFromBlocks} from '@/lib/portable-text';
import {getPublishedSanityClient, getSanityClient} from '@/sanity/client';
import {isSanityConfigured} from '@/sanity/env';
import {getCollectionsForProductPage} from '@pakfactory/sanity/product-page-collections';
import {PRODUCT_PAGE_SLUGS_QUERY} from '@pakfactory/sanity/queries';
import {normalizeSegment} from '../path-utils';

export const revalidate = 60;

type PageSeo =
    | {metaTitle?: string; metaDescription?: string}
    | null
    | undefined;

const getLanding = cache(async (pageSlug: string) => {
    if (!isSanityConfigured()) {
        return {page: null, manual: [], merged: []};
    }
    return getCollectionsForProductPage(
        await getSanityClient(),
        normalizeSegment(pageSlug),
    );
});

function truncateText(s: string, max: number): string {
    const t = s.trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1).trimEnd()}…`;
}

export async function generateStaticParams(): Promise<{pageSlug: string}[]> {
    if (!isSanityConfigured()) return [];
    const client = getPublishedSanityClient();
    const rows = await client
        .fetch<{slug: string}[] | null>(PRODUCT_PAGE_SLUGS_QUERY)
        .catch(() => null);
    if (!rows?.length) return [];
    return rows.map((r) => ({pageSlug: r.slug}));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{pageSlug: string}>;
}): Promise<Metadata> {
    const {pageSlug} = await params;
    const {page} = await getLanding(pageSlug);
    if (!page) return {title: 'Products'};
    const seo = page.seo as PageSeo;
    const solutionType = page.solutionType;
    const solutionBody =
        solutionType === 'industry'
            ? (page.industryBody as PortableTextBlock[] | undefined)
            : (page.standardBody as PortableTextBlock[] | undefined);
    const mainBody = page.body as PortableTextBlock[] | undefined;
    const description =
        seo?.metaDescription?.trim() ||
        plainTextFromBlocks(solutionBody) ||
        plainTextFromBlocks(mainBody);
    return {
        title: seo?.metaTitle?.trim() || page.title,
        description,
    };
}

export default async function ProductLandingPage({
    params,
}: {
    params: Promise<{pageSlug: string}>;
}) {
    const {pageSlug} = await params;
    const {page, merged} = await getLanding(pageSlug);
    if (!page) notFound();

    const solutionType = page.solutionType;
    const solutionBody =
        solutionType === 'industry'
            ? (page.industryBody as PortableTextBlock[] | undefined)
            : (page.standardBody as PortableTextBlock[] | undefined);
    const mainBody = page.body as PortableTextBlock[] | undefined;
    const headline = page.heroHeadline?.trim() || page.title;

    const excerpt =
        plainTextFromBlocks(solutionBody) || plainTextFromBlocks(mainBody);
    const heroDescription = excerpt
        ? truncateText(excerpt, 220)
        : 'Explore collections and solutions for this product line.';

    const firstCollection = merged.find((c) => c.slug);
    const ctaHref = firstCollection
        ? `/products/${page.slug}/${firstCollection.slug}`
        : '/products';

    const collectionsWithSlug = merged.filter(
        (c): c is typeof c & {slug: string} => Boolean(c.slug),
    );

    const breadcrumbData: {label: string; href?: string}[] = [
        {label: 'Products', href: '/products'},
        {label: page.title},
    ];

    return (
        <>
            <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-10 lg:px-8 lg:pt-12">
                <Breadcrumb className="mb-6">
                    <BreadcrumbList>
                        {breadcrumbData.map((crumb, index) => (
                            <div
                                key={`${crumb.label}-${index}`}
                                className="flex items-center gap-2.5"
                            >
                                <BreadcrumbItem>
                                    {index === breadcrumbData.length - 1 ? (
                                        <BreadcrumbPage>
                                            {crumb.label}
                                        </BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink
                                            href={crumb.href ?? '#'}
                                        >
                                            {crumb.label}
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                                {index < breadcrumbData.length - 1 ? (
                                    <BreadcrumbSeparator
                                        key={`${crumb.label}-sep`}
                                    />
                                ) : null}
                            </div>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <HeroSection
                badgeLabel="Product line"
                badgeCaption={page.title}
                headline={headline}
                description={heroDescription}
                ctaLabel={
                    firstCollection ? 'Browse collections' : 'All products'
                }
                ctaHref={ctaHref}
            />

            {collectionsWithSlug.length > 0 ? (
                <ProductCollectionList
                    collections={collectionsWithSlug}
                    pageSlug={page.slug}
                    title={page.title}
                    cta={{
                        label: 'Explore all products',
                        href: '/products',
                    }}
                />
            ) : null}
        </>
    );
}
