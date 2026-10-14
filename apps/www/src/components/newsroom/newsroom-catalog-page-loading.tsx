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
 * so the heading does not jump when the list resolves. The breadcrumb hides
 * itself on a section root, same as `/solutions`.
 */
export function NewsroomCatalogPageChrome() {
    return (
        <>
            <PageBreadcrumbSection
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
        <div className="grid grid-cols-1 gap-4 border-b border-dashed border-border py-8 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:gap-8">
            <Skeleton className="hidden h-4 w-28 md:block" />
            <div className="flex items-start gap-4 sm:gap-6">
                <Skeleton className="aspect-[4/3] w-28 shrink-0 rounded-xl sm:w-40" />
                <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </div>
            <Skeleton className="hidden h-4 w-20 md:block" />
        </div>
    );
}

/** List skeleton under live chrome. */
export function NewsroomCatalogPanelLoading({count = 4}: {count?: number} = {}) {
    return (
        <PageDielineSection innerClassName="pb-16 pt-8 md:pb-24 md:pt-12">
            <div aria-busy="true" aria-live="polite">
                <span className="sr-only">Loading announcements</span>
                <div className="flex flex-col gap-2 border-b border-border pb-6">
                    <Skeleton className="h-9 w-56" />
                    <Skeleton className="h-5 w-80 max-w-full" />
                </div>
                {Array.from({length: count}, (_, index) => (
                    <NewsListRowSkeleton key={index} />
                ))}
            </div>
        </PageDielineSection>
    );
}
