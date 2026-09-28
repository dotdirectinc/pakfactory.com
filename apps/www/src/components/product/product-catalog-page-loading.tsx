import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';

import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {ProductCatalogFiltersSkeleton} from '@/components/product/product-catalog-filters';
import {ProductCatalogListSkeleton} from '@/components/product/product-catalog-list';
import {WWW_ROUTES} from '@/lib/www-routes';

const PRODUCTS_HEADING = 'Products';
const PRODUCTS_INTRO =
    'Custom packaging solutions tailored to your brand.';

/**
 * Fixed breadcrumb + heading for `/products` — shared by the page and
 * Suspense fallbacks so the title does not jump when the grid resolves.
 */
export function ProductCatalogPageChrome({
    heading,
    intro,
}: {
    heading?: string | null;
    intro?: string | null;
} = {}) {
    const title = heading?.trim() || PRODUCTS_HEADING;
    const description = intro?.trim() || PRODUCTS_INTRO;

    return (
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
                settle
            />
        </>
    );
}

/** Facet rail + card grid — used by in-view Suspense under live chrome. */
export function ProductCatalogPanelLoading() {
    return (
        <PageDielineSection
            paddingBlock="none"
            innerClassName="flex flex-col gap-8 pb-24 pt-8"
        >
            <div
                className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8"
                aria-busy="true"
                aria-live="polite"
            >
                <span className="sr-only">Loading products catalog</span>
                <ProductCatalogFiltersSkeleton />
                <div className="min-w-0 flex-1">
                    <ProductCatalogListSkeleton />
                </div>
            </div>
        </PageDielineSection>
    );
}
