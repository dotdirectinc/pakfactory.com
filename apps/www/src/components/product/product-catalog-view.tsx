import {Suspense} from 'react';

import {
    ProductCatalogPageChrome,
    ProductCatalogPanelLoading,
} from '@/components/product/product-catalog-page-loading';
import {ProductCatalogPanel} from '@/components/product/product-catalog-panel';
import type {ProductLibraryResult} from '@/lib/catalog/types';

export {
    ProductCardSkeleton,
    ProductCatalogGridSkeleton,
} from '@/components/product/product-card-skeleton';

type ProductCatalogViewProps = {
    library: ProductLibraryResult;
    /** Sync filters to URL (route). Section embeds should set false. */
    urlSync?: boolean;
    /** When false, omit breadcrumb + page heading (section embed / page-owned chrome). */
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
    return (
        <>
            {showPageChrome ? (
                <ProductCatalogPageChrome heading={heading} intro={intro} />
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
            <Suspense fallback={<ProductCatalogPanelLoading />}>
                <ProductCatalogPanel
                    library={library}
                    urlSync={urlSync}
                    hideCatalogBorderTop={hideCatalogBorderTop}
                />
            </Suspense>
        </>
    );
}
