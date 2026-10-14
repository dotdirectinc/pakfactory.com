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
                align="center"
                settle
            />
        </>
    );
}

function NewsListRowSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-2 border-b border-border py-6.5 md:grid-cols-[9.5rem_minmax(0,1fr)_auto] md:gap-7">
            <Skeleton className="h-4 w-28" />
            <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-4 w-20" />
        </div>
    );
}

/** List skeleton under live chrome. */
export function NewsroomCatalogPanelLoading({count = 4}: {count?: number} = {}) {
    return (
        <PageDielineSection innerClassName="pb-16 pt-8 md:pb-24 md:pt-12">
            <div aria-busy="true" aria-live="polite" className="mx-auto w-full max-w-5xl">
                <span className="sr-only">Loading announcements</span>
                <div className="flex items-end justify-between gap-6 border-b border-border pb-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-9 w-40" />
                </div>
                {Array.from({length: count}, (_, index) => (
                    <NewsListRowSkeleton key={index} />
                ))}
            </div>
        </PageDielineSection>
    );
}
