import {Skeleton} from '@pakfactory/ui/components/skeleton';

import {cn} from '@pakfactory/ui/lib/utils';

/** Placeholder widths for ~5 category tabs (parity with customization-catalog-panel sticky nav). */
const DESKTOP_TAB_WIDTHS = ['w-12', 'w-24', 'w-16', 'w-20', 'w-44'] as const;

const MOBILE_CHIP_WIDTHS = ['w-14', 'w-24', 'w-16', 'w-20', 'w-36'] as const;

function SearchFieldSkeleton({className}: {className?: string}) {
    return (
        <Skeleton
            className={cn('h-10 w-full rounded-md', className)}
            aria-hidden
        />
    );
}

/**
 * Sticky toolbar placeholder while the customization library Suspense boundary
 * resolves. Layout mirrors customization-catalog-panel.tsx sticky blocks.
 */
export function CustomizationCatalogToolbarSkeleton() {
    return (
        <>
            {/* Mobile: sticky search + filters + category chips */}
            <div
                className="-mx-layout-gutter-inner sticky top-0 z-30 border-b border-dashed border-border bg-background px-layout-gutter-inner lg:hidden"
                aria-hidden
            >
                <div className="flex items-center gap-2 py-3">
                    <SearchFieldSkeleton className="min-w-0 flex-1" />
                    <Skeleton className="size-10 shrink-0 rounded-md" />
                </div>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
                    {MOBILE_CHIP_WIDTHS.map((width, index) => (
                        <Skeleton
                            key={index}
                            className={cn('h-9 shrink-0 rounded-md', width)}
                        />
                    ))}
                </div>
            </div>

            {/* Desktop: sticky underline tabs + search */}
            <div
                className="-mx-layout-gutter-inner hidden border-y border-dashed border-border bg-background lg:sticky lg:top-0 lg:z-30 lg:block"
                aria-hidden
            >
                <div className="flex flex-wrap items-stretch gap-x-6 gap-y-3 px-layout-gutter-inner">
                    <nav
                        className="relative flex min-w-0 flex-1 flex-wrap items-stretch gap-x-6 gap-y-2"
                        aria-hidden
                    >
                        {DESKTOP_TAB_WIDTHS.map((width, index) => (
                            <div
                                key={index}
                                className="relative flex flex-col items-start gap-2 py-4"
                            >
                                <Skeleton className={cn('h-4', width)} />
                                {index === 0 ? (
                                    <Skeleton className="h-1 w-12 rounded-full" />
                                ) : null}
                            </div>
                        ))}
                    </nav>
                    <div className="relative flex w-full min-w-56 items-center py-2 sm:ml-auto sm:w-64">
                        <SearchFieldSkeleton />
                    </div>
                </div>
            </div>
        </>
    );
}
