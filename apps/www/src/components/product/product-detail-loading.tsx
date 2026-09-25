import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {Skeleton} from '@pakfactory/ui/components/skeleton';

import {PageBreadcrumbSectionSkeleton} from '@/components/common/page-breadcrumb-section';
import {ProductGallerySkeleton} from '@/components/product/product-gallery';
import {ProductRequestRailSkeleton} from '@/components/product/product-request-rail';

/**
 * Instant navigation shell for `/products/[slug]` (PDP or line landing).
 * Composes the same component skeletons as {@link ProductDetailView}.
 */
export function ProductDetailLoading() {
    return (
        <>
            <PageBreadcrumbSectionSkeleton />
            <PageDielineSection paddingBlock="sm">
                <article
                    id="pdp-overview"
                    aria-busy="true"
                    aria-live="polite"
                    className="scroll-mt-32 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
                >
                    <span className="sr-only">Loading product</span>
                    <ProductGallerySkeleton />
                    <div>
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="mt-1 h-10 w-3/4 max-w-md" />
                        <div className="mt-4 space-y-2">
                            <Skeleton className="h-4 w-full max-w-lg" />
                            <Skeleton className="h-4 w-5/6 max-w-md" />
                        </div>
                        <ProductRequestRailSkeleton />
                    </div>
                </article>
            </PageDielineSection>
        </>
    );
}
