import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {cache} from 'react';
import ProductList from '@/components/products/product-list';
import HeroSection from '@/components/products/hero-section-01';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@pakfactory/ui/components/breadcrumb';
import {getPublishedSanityClient, getSanityClient} from '@/sanity/client';
import {isSanityConfigured} from '@/sanity/env';
import {getCollectionsForProductPage} from '@pakfactory/sanity/product-page-collections';
import {
    PRODUCT_COLLECTION_META_FOR_PATH_QUERY,
    PRODUCT_PAGE_COLLECTION_PATHS_QUERY,
    PRODUCTS_FOR_PAGE_AND_COLLECTION_QUERY,
} from '@pakfactory/sanity/queries';
import {normalizeSegment} from '../../path-utils';

export const revalidate = 60;

type ProductRow = {
    _id: string;
    title: string;
    name?: string | null;
    description?: string | null;
    handle: string;
    thumbUrl?: string | null;
    thumbAlt?: string | null;
};

type CollectionMetaRow = {
    collection: {
        title: string;
        slug: string | null;
        heroTitle?: string | null;
        heroHeadline?: string | null;
        heroDescription?: string | null;
        bannerUrl?: string | null;
        bannerAlt?: string | null;
    } | null;
} | null;

const getLanding = cache(async (pageSlug: string) => {
    if (!isSanityConfigured()) {
        return {page: null, manual: [], merged: []};
    }
    return getCollectionsForProductPage(
        await getSanityClient(),
        normalizeSegment(pageSlug),
    );
});

const getCollectionListing = cache(
    async (pageSlug: string, collectionSlug: string) => {
        const pageSlugNorm = normalizeSegment(pageSlug);
        const collectionSlugNorm = normalizeSegment(collectionSlug);
        if (!isSanityConfigured()) {
            return {products: [] as ProductRow[], meta: null, pageSlugNorm};
        }
        const sanity = await getSanityClient();
        const [products, meta] = await Promise.all([
            sanity
                .fetch<ProductRow[]>(PRODUCTS_FOR_PAGE_AND_COLLECTION_QUERY, {
                    pageSlug: pageSlugNorm,
                    collectionSlug: collectionSlugNorm,
                })
                .catch(() => [] as ProductRow[]),
            sanity
                .fetch<CollectionMetaRow>(
                    PRODUCT_COLLECTION_META_FOR_PATH_QUERY,
                    {
                        pageSlug: pageSlugNorm,
                        collectionSlug: collectionSlugNorm,
                    },
                )
                .catch(() => null),
        ]);
        return {products: products ?? [], meta, pageSlugNorm};
    },
);

export async function generateStaticParams(): Promise<
    {pageSlug: string; collectionSlug: string}[]
> {
    if (!isSanityConfigured()) return [];
    const client = getPublishedSanityClient();
    const rows = await client
        .fetch<{pageSlug: string; collectionSlug: string}[] | null>(
            PRODUCT_PAGE_COLLECTION_PATHS_QUERY,
        )
        .catch(() => null);
    if (!rows?.length) return [];
    const seen = new Set<string>();
    const out: {pageSlug: string; collectionSlug: string}[] = [];
    for (const row of rows) {
        const key = `${row.pageSlug}\0${row.collectionSlug}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({pageSlug: row.pageSlug, collectionSlug: row.collectionSlug});
    }
    return out;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{pageSlug: string; collectionSlug: string}>;
}): Promise<Metadata> {
    const {pageSlug, collectionSlug} = await params;
    const {products, meta} = await getCollectionListing(
        pageSlug,
        collectionSlug,
    );
    const {merged} = await getLanding(pageSlug);
    const col = merged.find(
        (c) =>
            c.slug &&
            normalizeSegment(c.slug) === normalizeSegment(collectionSlug),
    );
    const title =
        meta?.collection?.title?.trim() || col?.title?.trim() || 'Collection';
    return {title};
}

export default async function ProductCollectionPage({
    params,
}: {
    params: Promise<{pageSlug: string; collectionSlug: string}>;
}) {
    const {pageSlug, collectionSlug} = await params;
    const {products, meta, pageSlugNorm} = await getCollectionListing(
        pageSlug,
        collectionSlug,
    );
    const {page, merged} = await getLanding(pageSlug);

    const col = merged.find(
        (c) =>
            c.slug &&
            normalizeSegment(c.slug) === normalizeSegment(collectionSlug),
    );
    const collectionTitle =
        meta?.collection?.title?.trim() || col?.title?.trim() || null;

    if (products.length === 0 && !col) notFound();

    const displayTitle = collectionTitle ?? 'Collection';
    const programSlug = page?.slug ?? pageSlugNorm;
    const collectionPathSlug =
        col?.slug ?? meta?.collection?.slug ?? normalizeSegment(collectionSlug);

    const parentHref = `/products/${programSlug}`;

    const fallbackDescription = page?.title
        ? `${displayTitle} — part of ${page.title}. Browse products below or open a product for full details.`
        : `Browse ${displayTitle} products below or open an item for full details.`;

    const heroDescription =
        meta?.collection?.heroDescription?.trim() || fallbackDescription;

    const heroTitle = meta?.collection?.heroHeadline?.trim() || displayTitle;

    const breadcrumbData: {label: string; href?: string}[] = [
        {label: 'Products', href: '/products'},
        ...(page?.title ? [{label: page.title, href: parentHref}] : []),
        {label: displayTitle},
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
                badgeLabel="Collection"
                badgeCaption={displayTitle}
                headline={heroTitle}
                description={heroDescription}
                ctaLabel={
                    products.length > 0
                        ? 'Browse our styles'
                        : 'Back to product line'
                }
                ctaHref={
                    products.length > 0 ? '#collection-products' : parentHref
                }
            />

            <ProductList
                products={products}
                programSlug={programSlug}
                collectionPathSlug={collectionPathSlug}
                title={displayTitle}
                subtitle={heroDescription}
                cta={{label: 'View more styles', href: parentHref}}
            />
        </>
    );
}
