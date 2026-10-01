import {Skeleton} from '@pakfactory/ui/components/skeleton';

import {cn} from '@pakfactory/ui/lib/utils';

function SearchFieldSkeleton({className}: {className?: string}) {
    return (
        <Skeleton
            className={cn('h-10 w-full rounded-md', className)}
            aria-hidden
        />
    );
}

/**
 * Sticky toolbar placeholder while the product library Suspense boundary
 * resolves. Layout mirrors product-catalog-panel.tsx sticky search blocks.
 */
export function ProductCatalogToolbarSkeleton({
    hideCatalogBorderTop = false,
}: {
    hideCatalogBorderTop?: boolean;
} = {}) {
    return (
        <>
            {/* Mobile: sticky search + filters */}
            <div
                className="-mx-layout-gutter-inner sticky top-0 z-30 border-b border-dashed border-border bg-background px-layout-gutter-inner lg:hidden"
                aria-hidden
            >
                <div className="flex items-center gap-2 py-3">
                    <SearchFieldSkeleton className="min-w-0 flex-1" />
                    <Skeleton className="size-10 shrink-0 rounded-md" />
                </div>
            </div>

            {/* Desktop: sticky search bar (no category tabs) */}
            <div
                className={cn(
                    '-mx-layout-gutter-inner hidden border-dashed border-border bg-background lg:sticky lg:top-0 lg:z-30 lg:block',
                    hideCatalogBorderTop ? 'border-b' : 'border-y',
                )}
                aria-hidden
            >
                <div className="flex flex-wrap items-stretch gap-x-6 gap-y-3 px-layout-gutter-inner">
                    <div className="relative flex w-full min-w-56 items-center py-2 sm:ml-auto sm:w-64">
                        <SearchFieldSkeleton />
                    </div>
                </div>
            </div>
        </>
    );
}
