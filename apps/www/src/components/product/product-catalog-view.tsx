import {Suspense} from 'react';

import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {CatalogCard} from '@/components/ui/catalog-card';
import {
    ProductCard,
    type ProductCardData,
} from '@/components/product/product-card';
import {
    ProductCatalogListSkeleton,
} from '@/components/product/product-catalog-list';
import {ProductCatalogFiltersSkeleton} from '@/components/product/product-catalog-filters';
import {ProductCatalogPanel} from '@/components/product/product-catalog-panel';
import type {
    Product,
    ProductLibraryResult,
    ProductLine,
    ProductStyleRef,
} from '@/lib/catalog/types';
import {productHref, productStyleHref, WWW_ROUTES} from '@/lib/www-routes';

export {
    ProductCardSkeleton,
    ProductCatalogGridSkeleton,
} from '@/components/product/product-card-skeleton';

const TILE_GRID_CLASS =
    'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-8';

const PRODUCT_GRID_CLASS =
    'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-8';

function toProductCardData(
    product: Product,
    line: ProductLine,
): ProductCardData {
    const images = product.media
        .filter((item): item is {src: string; alt: string} =>
            Boolean(item.src),
        )
        .map((item) => ({
            src: item.src as string,
            alt: item.alt || product.title,
        }));
    return {
        title: product.title,
        href: productHref(product.slug),
        sku: product.sku,
        eyebrowLabel: product.productStyle.title ?? line.title,
        imageUrl: images[0]?.src ?? product.media[0]?.src ?? null,
        imageAlt: images[0]?.alt ?? product.media[0]?.alt ?? product.title,
        images: images.length > 0 ? images : undefined,
        moq: product.moq,
    };
}

type ProductCatalogViewProps = {
    library: ProductLibraryResult;
    /** Sync filters to URL (route). Section embeds should set false. */
    urlSync?: boolean;
    /** When false, omit breadcrumb + page heading (section embed). */
    showPageChrome?: boolean;
    heading?: string | null;
    intro?: string | null;
};

/** Faceted products library at `/products` (PROD-1845). */
export function ProductCatalogView({
    library,
    urlSync = true,
    showPageChrome = true,
    heading,
    intro,
}: ProductCatalogViewProps) {
    const title = heading?.trim() || 'Products';
    const description =
        intro?.trim() ||
        'Custom packaging solutions tailored to your brand.';

    return (
        <>
            {showPageChrome ? (
                <>
                    <PageBreadcrumbSection
                        items={[
                            {label: 'Home', href: WWW_ROUTES.home},
                            {label: 'Products'},
                        ]}
                    />
                    <PageHeadingSection
                        title={title}
                        description={description}
                    />
                </>
            ) : heading || intro ? (
                <div className="mx-auto w-full max-w-7xl px-4 pb-2 pt-8 sm:px-6 lg:px-8">
                    {heading ? (
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                            {heading}
                        </h2>
                    ) : null}
                    {intro ? (
                        <p className="mt-2 max-w-2xl text-muted-foreground">
                            {intro}
                        </p>
                    ) : null}
                </div>
            ) : null}
            <Suspense
                fallback={
                    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                            <ProductCatalogFiltersSkeleton />
                            <div className="min-w-0 flex-1">
                                <ProductCatalogListSkeleton />
                            </div>
                        </div>
                    </div>
                }
            >
                <ProductCatalogPanel library={library} urlSync={urlSync} />
            </Suspense>
        </>
    );
}

export function ProductLineView({line}: {line: ProductLine}) {
    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Products', href: WWW_ROUTES.products},
                    {label: line.title},
                ]}
            />
            <PageHeadingSection
                title={line.title}
                description={line.description}
            />
            <PageDielineSection innerClassName="pb-24 pt-8">
                <div className={TILE_GRID_CLASS}>
                    {line.styles.map((style) => {
                        const firstProductImage = line.products.find(
                            (product) =>
                                product.productStyle.slug === style.slug &&
                                product.media[0]?.src,
                        )?.media[0]?.src;
                        return (
                            <CatalogCard
                                key={style.slug}
                                href={productStyleHref(line.slug, style.slug)}
                                title={style.title}
                                description={
                                    style.shortDescription || undefined
                                }
                                imageSrc={style.imageUrl ?? firstProductImage}
                                imageAlt={style.imageAlt ?? style.title}
                            />
                        );
                    })}
                </div>
            </PageDielineSection>
        </>
    );
}

export function ProductStyleView({
    line,
    style,
}: {
    line: ProductLine;
    style: ProductStyleRef;
}) {
    const products = line.products.filter(
        (product) => product.productStyle.slug === style.slug,
    );
    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Products', href: WWW_ROUTES.products},
                    {label: line.title, href: productHref(line.slug)},
                    {label: style.title},
                ]}
            />
            <PageHeadingSection
                title={style.title}
                description={style.description}
            />
            <PageDielineSection innerClassName="pb-24 pt-8">
                <div className={PRODUCT_GRID_CLASS}>
                    {products.map((product) => (
                        <ProductCard
                            key={product.slug}
                            data={toProductCardData(product, line)}
                        />
                    ))}
                </div>
            </PageDielineSection>
        </>
    );
}
