import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {Skeleton} from '@pakfactory/ui/components/skeleton';

import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {WWW_ROUTES} from '@/lib/www-routes';

const SOLUTIONS_HEADING = 'Solutions';
const SOLUTIONS_INTRO =
    'Industry and channel packaging tailored to how you sell.';

const TILE_GRID_CLASS =
    'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-8';

/**
 * Fixed breadcrumb + heading for `/solutions` — shared by the page and
 * Suspense fallbacks so the title does not jump when the grid resolves.
 */
export function SolutionCatalogPageChrome() {
    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Solutions'},
                ]}
            />
            <PageHeadingSection
                title={SOLUTIONS_HEADING}
                description={SOLUTIONS_INTRO}
                settle
            />
        </>
    );
}

function SolutionCatalogTileSkeleton() {
    return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-background">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="flex flex-col items-center gap-4 px-8 pb-8 pt-4">
                <div className="flex w-full flex-col items-center gap-1">
                    <Skeleton className="h-6 w-3/4 max-w-[12rem]" />
                    <Skeleton className="mt-1 h-4 w-full max-w-xs" />
                </div>
                <Skeleton className="h-5 w-16" />
            </div>
        </div>
    );
}

/** Tile grid — used by in-view Suspense under live chrome. */
export function SolutionCatalogPanelLoading({count = 6}: {count?: number} = {}) {
    return (
        <PageDielineSection innerClassName="pb-24 pt-8">
            <div
                className={TILE_GRID_CLASS}
                aria-busy="true"
                aria-live="polite"
            >
                <span className="sr-only">Loading solutions catalog</span>
                {Array.from({length: count}, (_, index) => (
                    <SolutionCatalogTileSkeleton key={index} />
                ))}
            </div>
        </PageDielineSection>
    );
}
