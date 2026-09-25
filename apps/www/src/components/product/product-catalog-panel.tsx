'use client';

import {useCallback, useDeferredValue, useMemo, useState} from 'react';
import {ChevronDown, Search, SlidersHorizontal} from 'lucide-react';

import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {ProductCatalogFilters} from '@/components/product/product-catalog-filters';
import {ProductCatalogFiltersDrawer} from '@/components/product/product-catalog-filters-drawer';
import {
    ProductCatalogList,
    ProductCatalogListSkeleton,
} from '@/components/product/product-catalog-list';
import {
    buildProductFacetCounts,
    matchesProductItem,
} from '@/lib/catalog/product-catalog-filter';
import {useCatalogQueryState} from '@/lib/catalog/use-catalog-query-state';
import {useProgressiveReveal} from '@/lib/catalog/use-progressive-reveal';
import type {
    CustomizationFacetDef,
    ProductLibraryResult,
} from '@/lib/catalog/types';
import {
    PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID,
    PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID,
} from '@/lib/catalog/types';

const PAGE_SIZE = 12;

type ProductCatalogPanelProps = {
    library: ProductLibraryResult;
    /** When true, sync filters to the URL. Section embeds should pass false. */
    urlSync?: boolean;
};

function toggleValue(list: string[], value: string): string[] {
    return list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
}

export function ProductCatalogPanel({
    library,
    urlSync = true,
}: ProductCatalogPanelProps) {
    const facetIds = useMemo(() => {
        const ids = library.facetCatalog.shared.map((facet) => facet.id);
        ids.push(PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID);
        return ids;
    }, [library.facetCatalog.shared]);

    const {
        draftQuery,
        setDraftQuery,
        selections,
        setSelections,
        toggleFacet,
        reset,
    } = useCatalogQueryState({
        urlSync,
        facetIds,
    });

    const deferredQuery = useDeferredValue(draftQuery);
    const isSearchUpdating = draftQuery !== deferredQuery;

    const propertyTitles = library.propertyTitles;

    const selectedLines =
        selections[PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID] ?? [];
    const singleLineSlug =
        selectedLines.length === 1 ? selectedLines[0] : undefined;

    const lineEntry = useMemo(() => {
        if (!singleLineSlug) return null;
        return library.linesBySlug[singleLineSlug] ?? null;
    }, [singleLineSlug, library.linesBySlug]);

    const styleOptions = useMemo(() => {
        if (!singleLineSlug) return [];
        return library.stylesByLineSlug[singleLineSlug] ?? [];
    }, [singleLineSlug, library.stylesByLineSlug]);

    const selectedStyles = useMemo(() => {
        if (!singleLineSlug) return [];
        const allowed = new Set(styleOptions.map((opt) => opt.value));
        return (selections[PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID] ?? []).filter(
            (slug) => allowed.has(slug),
        );
    }, [singleLineSlug, styleOptions, selections]);

    const effectiveSelections = useMemo(() => {
        const next = {...selections};
        if (!singleLineSlug) {
            delete next[PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID];
            return next;
        }
        if (selectedStyles.length === 0) {
            delete next[PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID];
        } else {
            next[PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID] = selectedStyles;
        }
        return next;
    }, [selections, singleLineSlug, selectedStyles]);

    const filtered = useMemo(() => {
        return library.items.filter((item) =>
            matchesProductItem(
                item,
                {query: deferredQuery, selections: effectiveSelections},
                propertyTitles,
            ),
        );
    }, [library.items, deferredQuery, effectiveSelections, propertyTitles]);

    const filterResetKey = useMemo(
        () =>
            JSON.stringify({
                q: deferredQuery,
                selections: effectiveSelections,
            }),
        [deferredQuery, effectiveSelections],
    );

    const {
        visible,
        isAppending,
        appendCount,
        canAutoReveal,
        showLoadMore,
        revealNextBatch,
        sentinelRef,
    } = useProgressiveReveal({
        total: filtered.length,
        pageSize: PAGE_SIZE,
        appendDelayMs: 0,
        resetKey: filterResetKey,
    });

    const shown = filtered.slice(0, visible);

    const countsByFacet = useMemo(
        () =>
            buildProductFacetCounts(
                library.items,
                library.facetCatalog.shared,
                {query: deferredQuery, selections: effectiveSelections},
                propertyTitles,
            ),
        [
            library.items,
            library.facetCatalog.shared,
            deferredQuery,
            effectiveSelections,
            propertyTitles,
        ],
    );

    const styleFacetDef: CustomizationFacetDef | null = useMemo(() => {
        if (!singleLineSlug || styleOptions.length === 0) return null;
        return {
            id: PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID,
            title: 'Product Style',
            options: styleOptions,
        };
    }, [singleLineSlug, styleOptions]);

    const styleCounts = useMemo(() => {
        if (!styleFacetDef) return {};
        const counts = buildProductFacetCounts(
            library.items,
            [styleFacetDef],
            {query: deferredQuery, selections: effectiveSelections},
            propertyTitles,
        );
        return counts[PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID] ?? {};
    }, [
        styleFacetDef,
        library.items,
        deferredQuery,
        effectiveSelections,
        propertyTitles,
    ]);

    const onToggleLineOrOther = useCallback(
        (facetId: string, value: string) => {
            if (facetId !== PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID) {
                toggleFacet(facetId, value);
                return;
            }

            const nextLines = toggleValue(
                selections[PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID] ?? [],
                value,
            );
            const next: Record<string, string[]> = {...selections};
            if (nextLines.length === 0) {
                delete next[PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID];
            } else {
                next[PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID] = nextLines;
            }

            // Styles only apply when exactly one line is selected.
            if (nextLines.length !== 1) {
                delete next[PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID];
            } else if (
                selections[PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID]?.length ===
                    1 &&
                selections[PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID]?.[0] !==
                    nextLines[0]
            ) {
                delete next[PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID];
            }

            setDraftQuery('');
            setSelections(next, {clearQuery: true});
        },
        [selections, toggleFacet, setSelections, setDraftQuery],
    );

    const onToggleStyle = useCallback(
        (value: string) => {
            if (!singleLineSlug) return;
            toggleFacet(PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID, value);
        },
        [singleLineSlug, toggleFacet],
    );

    function onReset() {
        reset({clearQuery: true});
    }

    const [filtersOpen, setFiltersOpen] = useState(false);
    const activeFilterCount = useMemo(() => {
        let sum = 0;
        for (const [id, values] of Object.entries(selections)) {
            if (
                id === PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID &&
                !singleLineSlug
            ) {
                continue;
            }
            sum += values.length;
        }
        return sum;
    }, [selections, singleLineSlug]);

    function renderSearchField(className?: string) {
        return (
            <div className={cn('relative min-w-0 flex-1', className)}>
                <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                />
                <Input
                    type="search"
                    value={draftQuery}
                    onChange={(event) => {
                        setDraftQuery(event.target.value);
                    }}
                    placeholder="Search products"
                    aria-label="Search products"
                    className="rounded-md py-2 pl-9"
                />
            </div>
        );
    }

    const filterProps = {
        sharedFacets: library.facetCatalog.shared,
        selections,
        countsByFacet,
        onToggle: onToggleLineOrOther,
        onReset,
        styleOptions,
        selectedStyles,
        styleCounts,
        onToggleStyle,
    };

    return (
        <PageDielineSection
            paddingBlock="none"
            innerClassName="pb-24 flex flex-col gap-8"
        >
            {/* Mobile: sticky search + filters */}
            <div className="-mx-layout-gutter-inner border-b border-dashed border-border bg-background px-layout-gutter-inner lg:hidden sticky top-0 z-30">
                <div className="flex items-center gap-2 py-3">
                    {renderSearchField()}
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="relative size-10 shrink-0"
                        aria-label={
                            activeFilterCount > 0
                                ? `Filters, ${activeFilterCount} active`
                                : 'Filters'
                        }
                        onClick={() => setFiltersOpen(true)}
                    >
                        <SlidersHorizontal className="size-5" />
                        {activeFilterCount > 0 ? (
                            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                                {activeFilterCount > 9
                                    ? '9+'
                                    : activeFilterCount}
                            </span>
                        ) : null}
                    </Button>
                </div>
            </div>

            {/* Desktop: sticky search bar (no category tabs) */}
            <div className="-mx-layout-gutter-inner hidden border-y border-dashed border-border bg-background lg:sticky lg:top-0 lg:z-30 lg:block">
                <div className="flex flex-wrap items-stretch gap-x-6 gap-y-3 px-layout-gutter-inner">
                    <div className="relative flex w-full min-w-56 items-center py-2 sm:ml-auto sm:w-64">
                        {renderSearchField()}
                    </div>
                </div>
            </div>

            <ProductCatalogFiltersDrawer
                open={filtersOpen}
                onOpenChange={setFiltersOpen}
                resultCount={filtered.length}
                {...filterProps}
            />

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                <ProductCatalogFilters
                    resultCount={filtered.length}
                    totalCount={library.items.length}
                    {...filterProps}
                />

                <div
                    className={cn(
                        'flex min-w-0 flex-1 flex-col gap-6 transition-opacity duration-(--motion-fast)',
                        isSearchUpdating &&
                            !isAppending &&
                            'pointer-events-none opacity-60',
                    )}
                    aria-busy={isAppending || isSearchUpdating}
                >
                    <ProductCatalogList
                        items={shown}
                        lineEntry={lineEntry}
                    />
                    {isAppending ? (
                        <ProductCatalogListSkeleton count={appendCount} />
                    ) : null}
                    <div className="mt-4 flex flex-col items-center gap-2">
                        {canAutoReveal ? (
                            <div
                                ref={sentinelRef}
                                className="h-1 w-full"
                                aria-hidden
                            />
                        ) : null}
                        {showLoadMore ? (
                            <Button
                                type="button"
                                variant="link"
                                onClick={revealNextBatch}
                                className="gap-1 text-primary"
                            >
                                Load more
                                <ChevronDown className="size-4" aria-hidden />
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>
        </PageDielineSection>
    );
}
