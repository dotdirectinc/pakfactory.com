'use client';

import type {ReactNode} from 'react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';
import {ProductConfigurationBar} from '@/components/product/product-configuration-bar';
import {ProductGallery} from '@/components/product/product-gallery';
import {
    ProductPdpDraftProvider,
    useProductPdpDraft,
} from '@/components/product/product-pdp-draft';
import {ProductRequestRail} from '@/components/product/product-request-rail';
import {StatusBadge, StatusNotice} from '@/components/ui/status-badge';
import type {Product} from '@/lib/catalog/types';
import {WWW_ROUTES} from '@/lib/www-routes';

type ProductPdpShellProps = {
    product: Product;
    displaySku: string;
    children: ReactNode;
};

function ProductOverviewChrome({
    product,
    displaySku,
    configure,
}: {
    product: Product;
    displaySku: string;
    configure: ReactNode;
}) {
    return (
        <PageDielineSection paddingBlock="sm">
            <article
                id="pdp-overview"
                className="scroll-mt-32 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
            >
                <ProductGallery
                    media={product.media}
                    productTitle={product.title}
                    badgeLabel={
                        product.kind === 'inspiration' ? 'Inspiration' : undefined
                    }
                />
                <div>
                    <div className="flex items-center justify-between gap-4">
                        <p className="min-w-0 flex-1 truncate text-sm font-medium uppercase tracking-wide text-muted-foreground">
                            {displaySku}
                        </p>
                        <StatusBadge
                            status={product.status}
                            className="shrink-0"
                        />
                    </div>
                    <h1 className="mt-1 text-4xl font-semibold text-brand-blue">
                        {product.title}
                    </h1>
                    {product.description ? (
                        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                            {product.description}
                        </p>
                    ) : null}
                    {configure}
                </div>
            </article>
        </PageDielineSection>
    );
}

function OrderablePdpBody({
    product,
    displaySku,
    children,
}: ProductPdpShellProps) {
    const {showStickyBar} = useProductPdpDraft();

    return (
        <div
            className={cn(
                showStickyBar &&
                    'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]',
            )}
        >
            <ProductOverviewChrome
                product={product}
                displaySku={displaySku}
                configure={<ProductRequestRail />}
            />
            {children}
            <ProductConfigurationBar />
        </div>
    );
}

/**
 * Page-level PDP shell: shared draft for the request rail + sticky configuration
 * bar so the bar stays fixed while learn content scrolls.
 */
export function ProductPdpShell({
    product,
    displaySku,
    children,
}: ProductPdpShellProps) {
    const orderable = !product.status || product.status === 'active';

    if (!orderable) {
        return (
            <>
                <ProductOverviewChrome
                    product={product}
                    displaySku={displaySku}
                    configure={
                        <StatusNotice
                            status={product.status}
                            contactHref={WWW_ROUTES.contact}
                        />
                    }
                />
                {children}
            </>
        );
    }

    return (
        <ProductPdpDraftProvider product={product}>
            <OrderablePdpBody product={product} displaySku={displaySku}>
                {children}
            </OrderablePdpBody>
        </ProductPdpDraftProvider>
    );
}
