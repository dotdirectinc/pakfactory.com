import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {Skeleton} from '@pakfactory/ui/components/skeleton';

import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {WWW_ROUTES} from '@/lib/www-routes';

export const NEWSROOM_HEADING = 'Newsroom';
export const NEWSROOM_INTRO =
    'Company announcements and press resources from PakFactory.';

/**
 * Fixed chrome for `/newsroom` — shared by the page and its Suspense fallback
 * so the heading does not jump when the list resolves. Trail is
 * `Home / Newsroom`; a Company parent is left to the content team.
 */
export function NewsroomCatalogPageChrome() {
    return (
        <>
            <PageBreadcrumbSection
                showHome
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: NEWSROOM_HEADING},
                ]}
            />
            <PageHeadingSection
                title={NEWSROOM_HEADING}
                description={NEWSROOM_INTRO}
                settle
            />
        </>
    );
}

function NewsListRowSkeleton() {
    return (
        <div className="grid gap-2 border-b border-dashed border-border py-8 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:gap-8">
            <Skeleton className="hidden h-4 w-28 md:block" />
            <div className="flex items-start gap-4 sm:gap-6">
                <Skeleton className="aspect-[4/3] w-24 shrink-0 rounded-xl sm:w-32" />
                <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </div>
            <Skeleton className="hidden h-4 w-20 md:block" />
        </div>
    );
}

/** Tab strip + tab heading + list skeleton under live chrome (same layout as the panel). */
export function NewsroomCatalogPanelLoading({count = 4}: {count?: number} = {}) {
    return (
        <PageDielineSection
            paddingBlock="none"
            innerClassName="pb-16 sm:pb-20 lg:pb-24"
        >
            <div aria-busy="true" aria-live="polite">
                <span className="sr-only">Loading announcements</span>
                <div className="-mx-layout-gutter-inner flex items-center justify-between border-b border-dashed border-border px-layout-gutter-inner py-4">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-8 w-20" />
                </div>
                <div className="mb-8 mt-12 flex flex-wrap items-end justify-between gap-4">
                    <div className="flex flex-col gap-3">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-5 w-80 max-w-full" />
                    </div>
                    <Skeleton className="h-9 w-40" />
                </div>
                <div className="border-t border-dashed border-border">
                    {Array.from({length: count}, (_, index) => (
                        <NewsListRowSkeleton key={index} />
                    ))}
                </div>
            </div>
        </PageDielineSection>
    );
}
