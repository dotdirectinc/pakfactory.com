import {PageBreadcrumbSectionSkeleton} from '@/components/common/page-breadcrumb-section';
import {ProductGallerySkeleton} from '@/components/product/product-gallery';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {Skeleton} from '@pakfactory/ui/components/skeleton';

/**
 * Shown as soon as navigation to `/customizations/[category]/[handle]` starts
 * so the catalog does not stay frozen while RSC resolves (PROD-3102 parity).
 */
export default function CustomizationDetailSegmentLoading() {
    return (
        <>
            <PageBreadcrumbSectionSkeleton crumbCount={4} />
            <PageDielineSection borderBottom paddingBlock="md">
                <article
                    className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
                    aria-busy="true"
                    aria-live="polite"
                >
                    <span className="sr-only">Loading customization</span>
                    <ProductGallerySkeleton />
                    <div className="flex flex-col gap-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-3/4 max-w-md" />
                        <Skeleton className="h-4 w-full max-w-lg" />
                        <Skeleton className="h-4 w-5/6 max-w-md" />
                        <Skeleton className="mt-4 h-40 w-full max-w-md rounded-xl" />
                    </div>
                </article>
            </PageDielineSection>
        </>
    );
}
