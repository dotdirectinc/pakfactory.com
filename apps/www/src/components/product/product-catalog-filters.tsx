'use client';

import {Button} from '@pakfactory/ui/components/button';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    CatalogFacetGroup,
    CatalogFacetGroupSkeleton,
} from '@/components/ui/catalog-facet-group';
import {ProductLineFacetGroup} from '@/components/product/product-line-facet-group';
import type {CustomizationFacetDef, CustomizationFacetOption} from '@/lib/catalog/types';
import {PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID} from '@/lib/catalog/types';

/** Desktop filter rail: stable gutter + centered thin thumb (PROD-2599). */
const FILTER_RAIL_CLASS = cn(
    'hidden w-full flex-col gap-4 lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100dvh-6rem)] lg:w-60 lg:shrink-0 lg:self-start lg:overflow-y-auto lg:[scrollbar-gutter:stable]',
    '[&::-webkit-scrollbar]:w-3',
    '[&::-webkit-scrollbar-thumb]:rounded-full',
    '[&::-webkit-scrollbar-thumb]:border-2',
    '[&::-webkit-scrollbar-thumb]:border-transparent',
    '[&::-webkit-scrollbar-thumb]:bg-clip-padding',
);

type ProductCatalogFiltersProps = {
    resultCount: number;
    totalCount: number;
    sharedFacets: CustomizationFacetDef[];
    selections: Record<string, string[]>;
    countsByFacet: Record<string, Record<string, number>>;
    onToggle: (facetId: string, value: string) => void;
    onReset: () => void;
    /** Styles for the single selected Product Line (empty when not exactly one). */
    styleOptions?: CustomizationFacetOption[];
    selectedStyles?: string[];
    styleCounts?: Record<string, number>;
    onToggleStyle?: (value: string) => void;
};

export function ProductCatalogFilters({
    resultCount,
    totalCount,
    sharedFacets,
    selections,
    countsByFacet,
    onToggle,
    onReset,
    styleOptions = [],
    selectedStyles = [],
    styleCounts = {},
    onToggleStyle,
}: ProductCatalogFiltersProps) {
    const visibleFacets = sharedFacets.filter(
        (facet) => facet.options.length > 0,
    );

    return (
        <aside className={FILTER_RAIL_CLASS}>
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
                    {facet.id === PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID ? (
                        <ProductLineFacetGroup
                            title={facet.title}
                            options={facet.options}
                            selected={selections[facet.id] ?? []}
                            counts={countsByFacet[facet.id] ?? {}}
                            onToggle={(value) => onToggle(facet.id, value)}
                            styleOptions={styleOptions}
                            selectedStyles={selectedStyles}
                            styleCounts={styleCounts}
                            onToggleStyle={onToggleStyle}
                            defaultOpen
                        />
                    ) : (
                        <CatalogFacetGroup
                            title={facet.title}
                            options={facet.options}
                            selected={selections[facet.id] ?? []}
                            counts={countsByFacet[facet.id] ?? {}}
                            onToggle={(value) => onToggle(facet.id, value)}
                            defaultOpen
                        />
                    )}
                </div>
            ))}
        </aside>
    );
}

type ProductCatalogFiltersSkeletonProps = {
    /** Product type + Product Line + Industries/Sustainability slots. */
    sharedGroupCount?: number;
};

/** Loading rail: shared facet slots only (no category groups). */
export function ProductCatalogFiltersSkeleton({
    sharedGroupCount = 3,
}: ProductCatalogFiltersSkeletonProps) {
    return (
        <aside
            className={FILTER_RAIL_CLASS}
            aria-busy="true"
            aria-live="polite"
        >
            <span className="sr-only">Loading filters</span>
            <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="ml-auto h-4 w-20" />
            </div>
            {Array.from({length: sharedGroupCount}, (_, index) => (
                <div
                    key={index}
                    className={cn(
                        'pb-5',
                        index === 0 && 'pt-0',
                        index < sharedGroupCount - 1 &&
                            'border-b border-dashed border-border',
                    )}
                >
                    <CatalogFacetGroupSkeleton rowCount={3} />
                </div>
            ))}
        </aside>
    );
}
