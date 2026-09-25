import {
    pageDielineBorderYClass,
    pageDielineInnerClass,
    pageDielineOuterClass,
} from '@pakfactory/ui/components/page-dieline-section';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {cn} from '@pakfactory/ui/lib/utils';

import {PageBreadcrumbSectionSkeleton} from '@/components/common/page-breadcrumb-section';

/**
 * Instant navigation shell for `/products/[slug]` (line landing or PDP).
 * Line-hero-shaped so catalog entry cards do not flash a PDP gallery.
 */
export function ProductsSegmentLoading() {
    return (
        <>
            <PageBreadcrumbSectionSkeleton />
            <section
                aria-busy="true"
                aria-live="polite"
                className={cn(
                    pageDielineOuterClass(),
                    pageDielineBorderYClass({borderBottom: true}),
                    'relative overflow-clip bg-gradient-to-b from-muted from-0% via-background via-[65%] to-background',
                )}
            >
                <span className="sr-only">Loading products</span>
                <div className={pageDielineInnerClass('flex flex-col gap-1')}>
                    <div className="relative z-10 flex flex-col items-center gap-7 pt-8 pb-0 sm:pt-10 lg:pt-12">
                        <Skeleton className="size-display-mark shrink-0 rounded-xl" />
                        <div className="flex w-full flex-col items-center gap-4">
                            <Skeleton className="h-12 w-full max-w-[min(100%,42rem)] sm:h-14" />
                            <div className="flex w-full max-w-[732px] flex-col items-center gap-2">
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-5 w-5/6" />
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                                <Skeleton className="h-11 w-32 rounded-md" />
                                <Skeleton className="h-5 w-28" />
                            </div>
                        </div>
                    </div>
                    <div className="pb-12">
                        <Skeleton className="mx-auto aspect-4/3 w-full max-w-4xl rounded-2xl" />
                    </div>
                </div>
            </section>
        </>
    );
}
