'use client';

import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

import {CustomizationFacetGroup} from '@/components/customization/customization-facet-group';
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
        <aside className="flex w-full flex-col gap-4 lg:w-60 lg:shrink-0">
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
