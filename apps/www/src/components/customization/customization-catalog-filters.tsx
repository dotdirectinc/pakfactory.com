'use client';

import {Button} from '@pakfactory/ui/components/button';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    CustomizationFacetGroup,
    CustomizationFacetGroupSkeleton,
} from '@/components/customization/customization-facet-group';
import type {CustomizationFacetDef} from '@/lib/catalog/types';

type CustomizationCatalogFiltersProps = {
    resultCount: number;
    totalCount: number;
    sharedFacets: CustomizationFacetDef[];
    categoryFacets: CustomizationFacetDef[];
    selections: Record<string, string[]>;
    countsByFacet: Record<string, Record<string, number>>;
    onToggle: (facetId: string, value: string) => void;
    onReset: () => void;
    showCategoryHint?: boolean;
};

export function CustomizationCatalogFilters({
    resultCount,
    totalCount,
    sharedFacets,
    categoryFacets,
    selections,
    countsByFacet,
    onToggle,
    onReset,
    showCategoryHint = false,
}: CustomizationCatalogFiltersProps) {
    const visibleFacets = [...sharedFacets, ...categoryFacets].filter(
        (facet) => facet.options.length > 0,
    );

    return (
        <aside className="hidden w-full flex-col gap-4 lg:sticky lg:top-16 lg:flex lg:max-h-[calc(100dvh-5rem)] lg:w-60 lg:shrink-0 lg:self-start lg:overflow-y-auto">
            <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                    {resultCount} of {totalCount}
                </p>
                <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="ml-auto h-auto px-0 py-0 text-sm"
                    onClick={onReset}
                >
                    Reset Filter
                </Button>
            </div>

            {visibleFacets.map((facet, index) => (
                <div
                    key={facet.id}
                    className={cn(
                        'pb-5',
                        index === 0 && 'pt-0',
                        index < visibleFacets.length - 1 &&
                            'border-b border-dashed border-border',
                    )}
                >
                    <CustomizationFacetGroup
                        title={facet.title}
                        options={facet.options}
                        selected={selections[facet.id] ?? []}
                        counts={countsByFacet[facet.id] ?? {}}
                        onToggle={(value) => onToggle(facet.id, value)}
                        defaultOpen
                    />
                </div>
            ))}

            {showCategoryHint ? (
                <p className="text-xs text-muted-foreground">
                    More attribute filters appear once you pick a category
                    above.
                </p>
            ) : null}
        </aside>
    );
}

type CustomizationCatalogFiltersSkeletonProps = {
    /** Product Line + Sustainability (and any other shared facets). */
    sharedGroupCount?: number;
    /** Category-specific facet groups (0 on All). */
    categoryGroupCount?: number;
};

/**
 * Loading rail: shared facet slots always, plus category slots when a
 * category tab is active (Aesthetic / Finish Type / … under Finishing).
 */
export function CustomizationCatalogFiltersSkeleton({
    sharedGroupCount = 2,
    categoryGroupCount = 0,
}: CustomizationCatalogFiltersSkeletonProps) {
    const groupCount = sharedGroupCount + categoryGroupCount;

    return (
        <aside
            className="hidden w-full flex-col gap-4 lg:sticky lg:top-16 lg:flex lg:max-h-[calc(100dvh-5rem)] lg:w-60 lg:shrink-0 lg:self-start lg:overflow-y-auto"
            aria-busy="true"
            aria-live="polite"
        >
            <span className="sr-only">Loading filters</span>
            <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="ml-auto h-4 w-20" />
            </div>
            {Array.from({length: groupCount}, (_, index) => (
                <div
                    key={index}
                    className={cn(
                        'pb-5',
                        index === 0 && 'pt-0',
                        index < groupCount - 1 &&
                            'border-b border-dashed border-border',
                    )}
                >
                    <CustomizationFacetGroupSkeleton
                        rowCount={index < sharedGroupCount ? 3 : 4}
                    />
                </div>
            ))}
        </aside>
    );
}
