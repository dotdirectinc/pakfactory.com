import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {Skeleton} from '@pakfactory/ui/components/skeleton';

import {PageBreadcrumbSectionSkeleton} from '@/components/common/page-breadcrumb-section';
import {ProductCatalogPanelLoading} from '@/components/product/product-catalog-page-loading';

/**
 * Covers the `getStyle` wait — title is unknown yet.
 * Once style resolves, the page paints real chrome and suspends only the grid.
 */
export default function ProductStyleLoading() {
    return (
        <>
            <PageBreadcrumbSectionSkeleton crumbCount={3} />
            <PageDielineSection borderBottom={false} paddingBlock="lg">
                <div className="space-y-3" aria-hidden>
                    <Skeleton className="h-10 w-56 max-w-full" />
                    <Skeleton className="h-5 w-full max-w-xl" />
                </div>
            </PageDielineSection>
            <ProductCatalogPanelLoading />
        </>
    );
}
