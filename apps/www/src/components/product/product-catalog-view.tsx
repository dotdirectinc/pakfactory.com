import {Suspense} from 'react';

import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {
    ProductCatalogListSkeleton,
} from '@/components/product/product-catalog-list';
import {ProductCatalogFiltersSkeleton} from '@/components/product/product-catalog-filters';
import {ProductCatalogPanel} from '@/components/product/product-catalog-panel';
import type {ProductLibraryResult} from '@/lib/catalog/types';
import {WWW_ROUTES} from '@/lib/www-routes';

export {
    ProductCardSkeleton,
    ProductCatalogGridSkeleton,
} from '@/components/product/product-card-skeleton';

type ProductCatalogViewProps = {
    library: ProductLibraryResult;
    /** Sync filters to URL (route). Section embeds should set false. */
    urlSync?: boolean;
    /** When false, omit breadcrumb + page heading (section embed). */
    showPageChrome?: boolean;
    /** Drop the desktop search strip top border (style landing under a headed section). */
    hideCatalogBorderTop?: boolean;
    heading?: string | null;
    intro?: string | null;
};

/** Faceted products library at `/products` (PROD-1845). */
export function ProductCatalogView({
    library,
    urlSync = true,
    showPageChrome = true,
    hideCatalogBorderTop = false,
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
                        borderBottom={false}
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
                <ProductCatalogPanel
                    library={library}
                    urlSync={urlSync}
                    hideCatalogBorderTop={hideCatalogBorderTop}
                />
            </Suspense>
        </>
    );
}
