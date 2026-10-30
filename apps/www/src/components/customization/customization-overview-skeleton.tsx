import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {Skeleton} from '@pakfactory/ui/components/skeleton';

import {CUSTOMIZATION_OVERVIEW_ID} from '@/components/customization/customization-overview';

/**
 * Suspense fallback for the CDP body while the template + Works-with index
 * load. Mirrors the overview grid only — no Apply / Bookmark / configuration
 * controls, so Studio chrome cannot flash wrong then disappear.
 */
export function CustomizationOverviewSkeleton() {
    return (
        <PageDielineSection>
            <article
                id={CUSTOMIZATION_OVERVIEW_ID}
                aria-busy="true"
                aria-label="Loading customization overview"
                className="scroll-mt-32 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start"
            >
                <Skeleton className="aspect-square w-full rounded-lg" />
                <div className="flex min-w-0 flex-col gap-8">
                    <div className="flex flex-col gap-3">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-10 w-3/4 max-w-md" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                    <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/40 p-4">
                        <Skeleton className="h-3 w-28" />
                        <div className="flex flex-wrap gap-2">
                            <Skeleton className="size-8 rounded-full" />
                            <Skeleton className="size-8 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-24" />
                        <div className="flex flex-wrap gap-2">
                            <Skeleton className="h-8 w-24 rounded-full" />
                            <Skeleton className="h-8 w-32 rounded-full" />
                            <Skeleton className="h-8 w-28 rounded-full" />
                        </div>
                    </div>
                </div>
            </article>
        </PageDielineSection>
    );
}
