import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {Skeleton} from '@pakfactory/ui/components/skeleton';

import {PageBreadcrumbSectionSkeleton} from '@/components/common/page-breadcrumb-section';
import {CustomizationConfigPanelSkeleton} from '@/components/customization/customization-config-panel';
import {CustomizationOptionGallerySkeleton} from '@/components/customization/customization-option-gallery';

/**
 * Instant navigation shell for `/customizations/[category]/[handle]`.
 * Composes the same component skeletons as {@link CustomizationDetailView}.
 */
export function CustomizationDetailLoading() {
    return (
        <>
            <PageBreadcrumbSectionSkeleton crumbCount={3} />
            <PageDielineSection innerClassName="border-b border-dashed border-border">
                <article
                    id="customization-overview"
                    aria-busy="true"
                    aria-live="polite"
                    className="scroll-mt-32 grid gap-10 py-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
                >
                    <span className="sr-only">Loading customization</span>
                    <CustomizationOptionGallerySkeleton />
                    <div>
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="mt-1 h-10 w-3/4 max-w-md" />
                        <div className="mt-4 space-y-2">
                            <Skeleton className="h-4 w-full max-w-lg" />
                            <Skeleton className="h-4 w-5/6 max-w-md" />
                        </div>
                        <CustomizationConfigPanelSkeleton />
                    </div>
                </article>
            </PageDielineSection>
        </>
    );
}
