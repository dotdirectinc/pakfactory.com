'use client';

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {ChevronDown, Search, SlidersHorizontal} from 'lucide-react';

import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    CustomizationCatalogFilters,
    CustomizationCatalogFiltersSkeleton,
} from '@/components/customization/customization-catalog-filters';
import {CustomizationCatalogFiltersDrawer} from '@/components/customization/customization-catalog-filters-drawer';
import {
    CustomizationCatalogList,
    CustomizationCatalogListSkeleton,
} from '@/components/customization/customization-catalog-list';
import {
    CUSTOMIZATION_CATALOG_ALL_CATEGORY,
    itemHasFacetValue,
    matchesCustomizationItem,
} from '@/lib/catalog/customization-catalog-filter';
import type {
    CustomizationFacetDef,
    CustomizationLibraryResult,
} from '@/lib/catalog/types';

const PAGE_SIZE = 12;
/** Auto-reveal this many PAGE_SIZE batches via scroll before showing Load more. */
const AUTO_REVEAL_LIMIT = 2;
/** Simulated delay so append skeletons are visible before revealing the next batch. */
const APPEND_DELAY_MS = 400;
const ALL_CATEGORY = CUSTOMIZATION_CATALOG_ALL_CATEGORY;
const PARAM_CATEGORY = 'category';
const PARAM_Q = 'q';
/** Legacy load-more depth param — stripped on URL writes, never read. */
const LEGACY_PARAM_VISIBLE = 'visible';

export type CustomizationCatalogTab = {
    label: string;
    value: string;
};

type CustomizationCatalogPanelProps = {
    library: CustomizationLibraryResult;
    /** When true, sync filters to the URL. Section embeds should pass false. */
    urlSync?: boolean;
    /** Optional initial category slug from Studio section. */
    initialCategory?: string | null;
    showHeroChrome?: boolean;
};

function parseList(raw: string | null): string[] {
    if (!raw?.trim()) return [];
    return raw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
}

function serializeList(values: string[]): string | null {
    return values.length > 0 ? values.join(',') : null;
}

function toggleValue(list: string[], value: string): string[] {
    return list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
}

export function CustomizationCatalogPanel({
    library,
    urlSync = true,
    initialCategory = null,
}: CustomizationCatalogPanelProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const tabs: CustomizationCatalogTab[] = useMemo(
        () => [{label: 'All', value: ALL_CATEGORY}, ...library.tabs],
        [library.tabs],
    );

    const sharedFacetIds = useMemo(
        () => new Set(library.facetCatalog.shared.map((f) => f.id)),
        [library.facetCatalog.shared],
    );

    const readCategory = useCallback(() => {
        if (urlSync) {
            const fromUrl = searchParams.get(PARAM_CATEGORY)?.trim();
            if (fromUrl) return fromUrl;
        }
        if (initialCategory?.trim()) return initialCategory.trim();
        return ALL_CATEGORY;
    }, [urlSync, searchParams, initialCategory]);

    const [localCategory, setLocalCategory] = useState(readCategory);
    const [localQuery, setLocalQuery] = useState(() =>
        urlSync ? (searchParams.get(PARAM_Q) ?? '') : '',
    );
    const [localSelections, setLocalSelections] = useState<
        Record<string, string[]>
    >(() => {
        if (!urlSync) return {};
        const next: Record<string, string[]> = {};
        for (const facet of [
            ...library.facetCatalog.shared,
            ...Object.values(library.facetCatalog.byCategory).flat(),
        ]) {
            const values = parseList(searchParams.get(facet.id));
            if (values.length) next[facet.id] = values;
        }
        return next;
    });
    const [localVisible, setLocalVisible] = useState(PAGE_SIZE);

    const category = urlSync ? readCategory() : localCategory;
    const query = urlSync ? (searchParams.get(PARAM_Q) ?? '') : localQuery;
    const visible = localVisible;

    const selections = useMemo(() => {
        if (!urlSync) return localSelections;
        const next: Record<string, string[]> = {};
        const facets = [
            ...library.facetCatalog.shared,
            ...(category !== ALL_CATEGORY
                ? (library.facetCatalog.byCategory[category] ?? [])
                : []),
        ];
        for (const facet of facets) {
            const values = parseList(searchParams.get(facet.id));
            if (values.length) next[facet.id] = values;
        }
        return next;
    }, [
        urlSync,
        localSelections,
        searchParams,
        library.facetCatalog,
        category,
    ]);

    const writeParams = useCallback(
        (patch: {
            category?: string;
            q?: string;
            visible?: number;
            selections?: Record<string, string[]>;
            clearFacetIds?: string[];
        }) => {
            if (patch.visible !== undefined) setLocalVisible(patch.visible);

            if (!urlSync) {
                if (patch.category !== undefined)
                    setLocalCategory(patch.category);
                if (patch.q !== undefined) setLocalQuery(patch.q);
                if (patch.selections) setLocalSelections(patch.selections);
                return;
            }

            const touchesUrl =
                patch.category !== undefined ||
                patch.q !== undefined ||
                patch.selections !== undefined ||
                (patch.clearFacetIds?.length ?? 0) > 0;
            if (!touchesUrl) return;

            const params = new URLSearchParams(searchParams.toString());
            params.delete(LEGACY_PARAM_VISIBLE);

            const nextCategory = patch.category ?? category;
            if (!nextCategory || nextCategory === ALL_CATEGORY) {
                params.delete(PARAM_CATEGORY);
            } else {
                params.set(PARAM_CATEGORY, nextCategory);
            }

            const nextQ = patch.q ?? query;
            if (!nextQ.trim()) params.delete(PARAM_Q);
            else params.set(PARAM_Q, nextQ);

            const nextSelections = patch.selections ?? selections;
            const allFacetIds = new Set([
                ...library.facetCatalog.shared.map((f) => f.id),
                ...Object.values(library.facetCatalog.byCategory)
                    .flat()
                    .map((f) => f.id),
            ]);
            for (const id of allFacetIds) {
                params.delete(id);
            }
            for (const id of patch.clearFacetIds ?? []) {
                params.delete(id);
            }
            for (const [id, values] of Object.entries(nextSelections)) {
                const serialized = serializeList(values);
                if (serialized) params.set(id, serialized);
            }

            const qs = params.toString();
            startTransition(() => {
                router.replace(qs ? `${pathname}?${qs}` : pathname, {
                    scroll: false,
                });
            });
        },
        [
            urlSync,
            searchParams,
            category,
            query,
            selections,
            library.facetCatalog,
            pathname,
            router,
        ],
    );

    const categoryFacets: CustomizationFacetDef[] =
        category === ALL_CATEGORY
            ? []
            : (library.facetCatalog.byCategory[category] ?? []);

    const filtered = useMemo(() => {
        return library.items.filter((item) =>
            matchesCustomizationItem(item, {category, query, selections}),
        );
    }, [library.items, category, query, selections]);

    const shown = filtered.slice(0, visible);

    const [appendCount, setAppendCount] = useState(0);
    const isAppending = appendCount > 0;
    const appendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const isAppendingRef = useRef(false);
    const pendingVisibleRef = useRef<number | null>(null);

    const clearAppend = useCallback(() => {
        if (appendTimeoutRef.current) {
            clearTimeout(appendTimeoutRef.current);
            appendTimeoutRef.current = null;
        }
        isAppendingRef.current = false;
        pendingVisibleRef.current = null;
        setAppendCount(0);
    }, []);

    useEffect(() => () => clearAppend(), [clearAppend]);

    useEffect(() => {
        if (!isAppendingRef.current) return;
        if (visible <= PAGE_SIZE) {
            clearAppend();
            return;
        }
        if (
            pendingVisibleRef.current != null &&
            visible >= pendingVisibleRef.current
        ) {
            clearAppend();
        }
    }, [visible, clearAppend]);

    const hasMore = visible < filtered.length;
    const autoLoadsDone = Math.max(
        0,
        Math.floor((visible - PAGE_SIZE) / PAGE_SIZE),
    );
    const canAutoReveal =
        !isPending &&
        !isAppending &&
        hasMore &&
        autoLoadsDone < AUTO_REVEAL_LIMIT;
    const showLoadMore =
        !isPending &&
        !isAppending &&
        hasMore &&
        autoLoadsDone >= AUTO_REVEAL_LIMIT;

    const revealNextBatch = useCallback(() => {
        if (isAppendingRef.current) return;
        if (visible >= filtered.length) return;

        const count = Math.min(PAGE_SIZE, filtered.length - visible);
        const nextVisible = visible + PAGE_SIZE;
        isAppendingRef.current = true;
        pendingVisibleRef.current = nextVisible;
        setAppendCount(count);

        appendTimeoutRef.current = setTimeout(() => {
            appendTimeoutRef.current = null;
            writeParams({visible: nextVisible});
        }, APPEND_DELAY_MS);
    }, [visible, filtered.length, writeParams]);

    const sentinelRef = useRef<HTMLDivElement>(null);
    const autoRevealLockedRef = useRef(false);

    useEffect(() => {
        autoRevealLockedRef.current = false;
    }, [visible]);

    useEffect(() => {
        if (!canAutoReveal) return;
        const el = sentinelRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry?.isIntersecting) return;
                if (autoRevealLockedRef.current) return;
                autoRevealLockedRef.current = true;
                revealNextBatch();
            },
            {rootMargin: '200px'},
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [canAutoReveal, revealNextBatch, visible]);

    const countForTab = useCallback(
        (tabValue: string) => {
            return library.items.filter((item) =>
                matchesCustomizationItem(item, {
                    category: tabValue,
                    query,
                    selections,
                }),
            ).length;
        },
        [library.items, query, selections],
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
        const result: Record<string, Record<string, number>> = {};

        for (const facet of facets) {
            const counts: Record<string, number> = {};
            for (const opt of facet.options) {
                // Distribution in the current result set (not OR-refinement size).
                counts[opt.value] = filtered.filter((item) =>
                    itemHasFacetValue(item, facet.id, opt.value),
                ).length;
            }
            result[facet.id] = counts;
        }
        return result;
    }, [library.facetCatalog.shared, categoryFacets, filtered]);

    function selectCategory(next: string) {
        // Clear category-specific facet selections when switching tabs.
        const nextSelections: Record<string, string[]> = {};
        for (const [id, values] of Object.entries(selections)) {
            if (sharedFacetIds.has(id)) nextSelections[id] = values;
        }
        writeParams({
            category: next,
            q: '',
            selections: nextSelections,
            visible: PAGE_SIZE,
            clearFacetIds: Object.keys(selections).filter(
                (id) => !sharedFacetIds.has(id),
            ),
        });
        if (!urlSync) {
            setLocalSelections(nextSelections);
            setLocalQuery('');
        }
    }

    function onToggle(facetId: string, value: string) {
        const next = {
            ...selections,
            [facetId]: toggleValue(selections[facetId] ?? [], value),
        };
        if (next[facetId]?.length === 0) delete next[facetId];
        writeParams({selections: next, visible: PAGE_SIZE, q: ''});
        if (!urlSync) {
            setLocalSelections(next);
            setLocalQuery('');
        }
    }

    function onReset() {
        writeParams({
            category: ALL_CATEGORY,
            q: '',
            selections: {},
            visible: PAGE_SIZE,
            clearFacetIds: Object.keys(selections),
        });
        if (!urlSync) {
            setLocalCategory(ALL_CATEGORY);
            setLocalQuery('');
            setLocalSelections({});
        }
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
                    value={query}
                    onChange={(event) => {
                        const next = event.target.value;
                        writeParams({q: next, visible: PAGE_SIZE});
                        if (!urlSync) setLocalQuery(next);
                    }}
                    placeholder="Search customizations"
                    aria-label="Search customizations"
                    className="rounded-full py-2 pl-9"
                />
            </div>
        );
    }

    return (
        <PageDielineSection innerClassName="pb-24 pt-8 flex flex-col gap-6">
            {/* Mobile: sticky search + filters + category chips */}
            <div className="-mx-4 border-b border-dashed border-border bg-background px-4 md:-mx-8 md:px-8 lg:hidden sticky top-0 z-30">
                <div className="flex items-center gap-2 py-3">
                    {renderSearchField()}
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="relative size-10 shrink-0 rounded-full"
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
                                    'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
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
            <div className="-mx-4 hidden border-y border-dashed border-border bg-background md:-mx-8 lg:sticky lg:top-0 lg:z-30 lg:block">
                <div className="flex flex-wrap items-stretch gap-x-6 gap-y-3 px-4 md:px-8">
                    <nav
                        ref={navRef}
                        className="relative flex min-w-0 flex-1 flex-wrap items-stretch gap-x-6 gap-y-2"
                        aria-label="Customization categories"
                        onMouseLeave={() => setHoveredTab(null)}
                    >
                        <span
                            aria-hidden
                            className={cn(
                                'pointer-events-none absolute bottom-0 z-10 h-0.5 bg-primary',
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
                                        'relative flex items-center gap-2 py-4 text-md font-semibold transition-colors duration-200',
                                        isActive
                                            ? 'text-primary'
                                            : 'text-mauve-400 hover:text-primary',
                                    )}
                                    aria-pressed={isActive}
                                >
                                    <span>{tab.label}</span>
                                    <span className="font-normal tabular-nums text-mauve-400">
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
                {isPending ? (
                    <CustomizationCatalogFiltersSkeleton
                        categoryGroupCount={
                            category === ALL_CATEGORY ? 0 : 3
                        }
                    />
                ) : (
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
                )}

                <div
                    className="flex min-w-0 flex-1 flex-col gap-6"
                    aria-busy={isPending || isAppending}
                >
                    {isPending && !isAppending && visible <= PAGE_SIZE ? (
                        <CustomizationCatalogListSkeleton />
                    ) : (
                        <>
                            <CustomizationCatalogList items={shown} />
                            {isAppending ? (
                                <CustomizationCatalogListSkeleton
                                    count={appendCount}
                                />
                            ) : null}
                        </>
                    )}
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
