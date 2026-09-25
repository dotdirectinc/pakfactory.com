'use client';

import {
    useCallback,
    useDeferredValue,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {ChevronDown, Search, SlidersHorizontal} from 'lucide-react';

import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {CustomizationCatalogFilters} from '@/components/customization/customization-catalog-filters';
import {CustomizationCatalogFiltersDrawer} from '@/components/customization/customization-catalog-filters-drawer';
import {
    CustomizationCatalogList,
    CustomizationCatalogListSkeleton,
} from '@/components/customization/customization-catalog-list';
import {
    buildCustomizationFacetCounts,
    CUSTOMIZATION_CATALOG_ALL_CATEGORY,
    matchesCustomizationItem,
} from '@/lib/catalog/customization-catalog-filter';
import {useCatalogQueryState} from '@/lib/catalog/use-catalog-query-state';
import {useProgressiveReveal} from '@/lib/catalog/use-progressive-reveal';
import type {
    CustomizationFacetDef,
    CustomizationLibraryResult,
} from '@/lib/catalog/types';

const PAGE_SIZE = 12;
const ALL_CATEGORY = CUSTOMIZATION_CATALOG_ALL_CATEGORY;
const EXTRA_CATEGORY = 'category';

export type CustomizationCatalogTab = {
    label: string;
    value: string;
};

type CustomizationCatalogPanelProps = {
    library: CustomizationLibraryResult;
    /** When true, sync filters to the URL. Section embeds should pass false. */
    urlSync?: boolean;
    /** Optional initial category slug from Studio section embeds. */
    initialCategory?: string | null;
    showHeroChrome?: boolean;
};

export function CustomizationCatalogPanel({
    library,
    urlSync = true,
    initialCategory = null,
}: CustomizationCatalogPanelProps) {
    const tabs: CustomizationCatalogTab[] = useMemo(
        () => [{label: 'All', value: ALL_CATEGORY}, ...library.tabs],
        [library.tabs],
    );

    const sharedFacetIds = useMemo(
        () => new Set(library.facetCatalog.shared.map((f) => f.id)),
        [library.facetCatalog.shared],
    );

    const allFacetIds = useMemo(() => {
        const ids = new Set<string>();
        for (const facet of library.facetCatalog.shared) ids.add(facet.id);
        for (const group of Object.values(library.facetCatalog.byCategory)) {
            for (const facet of group) ids.add(facet.id);
        }
        return [...ids];
    }, [library.facetCatalog]);

    const initialExtras = useMemo(
        () => ({
            [EXTRA_CATEGORY]: initialCategory?.trim() || ALL_CATEGORY,
        }),
        [initialCategory],
    );

    const extraParams = useMemo(
        () => ({
            [EXTRA_CATEGORY]: {
                param: 'category',
                defaultValue: ALL_CATEGORY,
            },
        }),
        [],
    );

    const {
        draftQuery,
        setDraftQuery,
        selections,
        extras,
        setSelections,
        toggleFacet,
        reset,
    } = useCatalogQueryState({
        urlSync,
        facetIds: allFacetIds,
        extraParams,
        initialExtras,
    });

    const category = extras[EXTRA_CATEGORY] ?? ALL_CATEGORY;
    const deferredQuery = useDeferredValue(draftQuery);
    const isSearchUpdating = draftQuery !== deferredQuery;

    const categoryFacets: CustomizationFacetDef[] =
        category === ALL_CATEGORY
            ? []
            : (library.facetCatalog.byCategory[category] ?? []);

    const filtered = useMemo(() => {
        return library.items.filter((item) =>
            matchesCustomizationItem(item, {
                category,
                query: deferredQuery,
                selections,
            }),
        );
    }, [library.items, category, deferredQuery, selections]);

    const filterResetKey = useMemo(
        () =>
            JSON.stringify({
                category,
                q: deferredQuery,
                selections,
            }),
        [category, deferredQuery, selections],
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

    const countForTab = useCallback(
        (tabValue: string) => {
            return library.items.filter((item) =>
                matchesCustomizationItem(item, {
                    category: tabValue,
                    query: deferredQuery,
                    selections,
                }),
            ).length;
        },
        [library.items, deferredQuery, selections],
    );

    const navRef = useRef<HTMLElement>(null);
    const tabRefs = useRef(new Map<string, HTMLButtonElement>());
    const [hoveredTab, setHoveredTab] = useState<string | null>(null);
    const [indicator, setIndicator] = useState({
        left: 0,
        width: 0,
        ready: false,
    });
    /** After first layout placement, enable slide transitions (hover / tab clicks). */
    const [indicatorTransitionEnabled, setIndicatorTransitionEnabled] =
        useState(false);

    const updateIndicator = useCallback(() => {
        const nav = navRef.current;
        const target = hoveredTab ?? category;
        const btn = tabRefs.current.get(target);
        if (!nav || !btn) {
            setIndicator((prev) =>
                prev.ready ? {...prev, ready: false} : prev,
            );
            return;
        }
        const navRect = nav.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        setIndicator({
            left: btnRect.left - navRect.left + nav.scrollLeft,
            width: btnRect.width,
            ready: true,
        });
    }, [category, hoveredTab]);

    useLayoutEffect(() => {
        updateIndicator();
        const nav = navRef.current;
        const ro =
            typeof ResizeObserver !== 'undefined'
                ? new ResizeObserver(() => updateIndicator())
                : null;
        if (nav && ro) ro.observe(nav);
        window.addEventListener('resize', updateIndicator);
        return () => {
            ro?.disconnect();
            window.removeEventListener('resize', updateIndicator);
        };
    }, [updateIndicator, tabs]);

    // Enable slide only after the first positioned frame has painted — otherwise
    // deep links animate left from 0 (under All) to the seeded category.
    useEffect(() => {
        if (indicator.ready) setIndicatorTransitionEnabled(true);
    }, [indicator.ready]);

    const countsByFacet = useMemo(() => {
        const facets = [...library.facetCatalog.shared, ...categoryFacets];
        return buildCustomizationFacetCounts(library.items, facets, {
            category,
            query: deferredQuery,
            selections,
        });
    }, [
        library.items,
        library.facetCatalog.shared,
        categoryFacets,
        category,
        deferredQuery,
        selections,
    ]);

    function selectCategory(next: string) {
        // Clear category-specific facet selections when switching tabs.
        const nextSelections: Record<string, string[]> = {};
        for (const [id, values] of Object.entries(selections)) {
            if (sharedFacetIds.has(id)) nextSelections[id] = values;
        }
        setSelections(nextSelections, {
            clearQuery: true,
            extras: {[EXTRA_CATEGORY]: next},
        });
    }

    function onToggle(facetId: string, value: string) {
        toggleFacet(facetId, value);
    }

    function onReset() {
        reset({clearExtrasToDefault: true, clearQuery: true});
    }

    const [filtersOpen, setFiltersOpen] = useState(false);
    const activeFilterCount = useMemo(
        () =>
            Object.values(selections).reduce(
                (sum, values) => sum + values.length,
                0,
            ),
        [selections],
    );

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
                    placeholder="Search customizations"
                    aria-label="Search customizations"
                    className="rounded-md py-2 pl-9"
                />
            </div>
        );
    }

    return (
        <PageDielineSection
            paddingBlock="none"
            innerClassName="pb-24 flex flex-col gap-8"
        >
            {/* Mobile: sticky search + filters + category chips */}
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
                <nav
                    className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3"
                    aria-label="Customization categories"
                >
                    {tabs.map((tab) => {
                        const isActive = category === tab.value;
                        return (
                            <button
                                key={tab.value}
                                type="button"
                                onClick={() => selectCategory(tab.value)}
                                className={cn(
                                    'shrink-0 rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'border-foreground bg-foreground text-background'
                                        : 'border-border bg-background text-foreground',
                                )}
                                aria-pressed={isActive}
                            >
                                {tab.label}{' '}
                                <span
                                    className={cn(
                                        'tabular-nums',
                                        isActive
                                            ? 'text-background/80'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {countForTab(tab.value)}
                                </span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Desktop: sticky underline tabs + search */}
            <div className="-mx-layout-gutter-inner hidden border-y border-dashed border-border bg-background lg:sticky lg:top-0 lg:z-30 lg:block">
                <div className="flex flex-wrap items-stretch gap-x-6 gap-y-3 px-layout-gutter-inner">
                    <nav
                        ref={navRef}
                        className="relative flex min-w-0 flex-1 flex-wrap items-stretch gap-x-6 gap-y-2"
                        aria-label="Customization categories"
                        onMouseLeave={() => setHoveredTab(null)}
                    >
                        <span
                            aria-hidden
                            className={cn(
                                'pointer-events-none absolute bottom-0 z-10 h-1 bg-primary',
                                indicatorTransitionEnabled &&
                                    'transition-[left,width,opacity] duration-300 ease-out',
                                indicator.ready ? 'opacity-100' : 'opacity-0',
                            )}
                            style={{
                                left: indicator.left,
                                width: indicator.width,
                            }}
                        />
                        {tabs.map((tab) => {
                            const isActive = category === tab.value;
                            return (
                                <button
                                    key={tab.value}
                                    ref={(el) => {
                                        if (el) {
                                            tabRefs.current.set(tab.value, el);
                                        } else {
                                            tabRefs.current.delete(tab.value);
                                        }
                                    }}
                                    type="button"
                                    onClick={() => selectCategory(tab.value)}
                                    onMouseEnter={() =>
                                        setHoveredTab(tab.value)
                                    }
                                    className={cn(
                                        'relative flex items-center gap-2 py-4 text-sm font-medium transition-colors duration-200',
                                        isActive
                                            ? 'text-primary'
                                            : 'text-muted-foreground hover:text-primary',
                                    )}
                                    aria-pressed={isActive}
                                >
                                    <span>{tab.label}</span>
                                    <span className="font-normal tabular-nums text-muted-foreground/50">
                                        {countForTab(tab.value)}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>
                    <div className="relative flex w-full min-w-[14rem] items-center py-2 sm:ml-auto sm:w-64">
                        {renderSearchField()}
                    </div>
                </div>
            </div>

            <CustomizationCatalogFiltersDrawer
                open={filtersOpen}
                onOpenChange={setFiltersOpen}
                resultCount={filtered.length}
                category={category}
                categoryOptions={tabs}
                categoryCounts={Object.fromEntries(
                    tabs.map((tab) => [tab.value, countForTab(tab.value)]),
                )}
                onSelectCategory={selectCategory}
                sharedFacets={library.facetCatalog.shared}
                categoryFacets={categoryFacets}
                selections={selections}
                countsByFacet={countsByFacet}
                onToggle={onToggle}
                onReset={onReset}
                showCategoryHint={category === ALL_CATEGORY}
            />

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                <CustomizationCatalogFilters
                    resultCount={filtered.length}
                    totalCount={library.items.length}
                    sharedFacets={library.facetCatalog.shared}
                    categoryFacets={categoryFacets}
                    selections={selections}
                    countsByFacet={countsByFacet}
                    onToggle={onToggle}
                    onReset={onReset}
                    showCategoryHint={category === ALL_CATEGORY}
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
                    <CustomizationCatalogList items={shown} />
                    {isAppending ? (
                        <CustomizationCatalogListSkeleton
                            count={appendCount}
                        />
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
