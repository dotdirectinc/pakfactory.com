'use client';

import {
    useCallback,
    useDeferredValue,
    useEffect,
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
    ProductCatalogFilters,
} from '@/components/product/product-catalog-filters';
import {ProductCatalogFiltersDrawer} from '@/components/product/product-catalog-filters-drawer';
import {
    ProductCatalogList,
    ProductCatalogListSkeleton,
} from '@/components/product/product-catalog-list';
import {
    buildProductFacetCounts,
    matchesProductItem,
} from '@/lib/catalog/product-catalog-filter';
import {useCatalogSearchDraft} from '@/lib/catalog/use-catalog-search-draft';
import type {ProductLibraryResult} from '@/lib/catalog/types';
import {PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID} from '@/lib/catalog/types';

const PAGE_SIZE = 12;
/** Auto-reveal this many PAGE_SIZE batches via scroll before showing Load more. */
const AUTO_REVEAL_LIMIT = 2;
/** Simulated delay so append skeletons are visible before revealing the next batch. */
const APPEND_DELAY_MS = 400;
const PARAM_Q = 'q';
/** Legacy load-more depth param — stripped on URL writes, never read. */
const LEGACY_PARAM_VISIBLE = 'visible';

type ProductCatalogPanelProps = {
    library: ProductLibraryResult;
    /** When true, sync filters to the URL. Section embeds should pass false. */
    urlSync?: boolean;
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

export function ProductCatalogPanel({
    library,
    urlSync = true,
}: ProductCatalogPanelProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [localQuery, setLocalQuery] = useState(() =>
        urlSync ? (searchParams.get(PARAM_Q) ?? '') : '',
    );
    const [localSelections, setLocalSelections] = useState<
        Record<string, string[]>
    >(() => {
        if (!urlSync) return {};
        const next: Record<string, string[]> = {};
        for (const facet of library.facetCatalog.shared) {
            const values = parseList(searchParams.get(facet.id));
            if (values.length) next[facet.id] = values;
        }
        return next;
    });
    const [localVisible, setLocalVisible] = useState(PAGE_SIZE);

    const query = urlSync ? (searchParams.get(PARAM_Q) ?? '') : localQuery;
    const visible = localVisible;

    const selections = useMemo(() => {
        if (!urlSync) return localSelections;
        const next: Record<string, string[]> = {};
        for (const facet of library.facetCatalog.shared) {
            const values = parseList(searchParams.get(facet.id));
            if (values.length) next[facet.id] = values;
        }
        return next;
    }, [urlSync, localSelections, searchParams, library.facetCatalog.shared]);

    const writeParams = useCallback(
        (patch: {
            q?: string;
            visible?: number;
            selections?: Record<string, string[]>;
            clearFacetIds?: string[];
        }) => {
            if (patch.visible !== undefined) setLocalVisible(patch.visible);

            if (!urlSync) {
                if (patch.q !== undefined) setLocalQuery(patch.q);
                if (patch.selections) setLocalSelections(patch.selections);
                return;
            }

            const touchesUrl =
                patch.q !== undefined ||
                patch.selections !== undefined ||
                (patch.clearFacetIds?.length ?? 0) > 0;
            if (!touchesUrl) return;

            const params = new URLSearchParams(searchParams.toString());
            params.delete(LEGACY_PARAM_VISIBLE);

            const nextQ = patch.q ?? query;
            if (!nextQ.trim()) params.delete(PARAM_Q);
            else params.set(PARAM_Q, nextQ);

            const nextSelections = patch.selections ?? selections;
            const allFacetIds = new Set(
                library.facetCatalog.shared.map((f) => f.id),
            );
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
            query,
            selections,
            library.facetCatalog.shared,
            pathname,
            router,
        ],
    );

    const commitSearch = useCallback(
        (q: string) => {
            writeParams({q, visible: PAGE_SIZE});
        },
        [writeParams],
    );

    const {draftQuery, setDraftQuery} = useCatalogSearchDraft({
        committedQuery: query,
        onCommit: commitSearch,
    });
    const deferredQuery = useDeferredValue(draftQuery);
    const isSearchUpdating = draftQuery !== deferredQuery;

    const filtered = useMemo(() => {
        return library.items.filter((item) =>
            matchesProductItem(item, {query: deferredQuery, selections}),
        );
    }, [library.items, deferredQuery, selections]);

    const lineEntry = useMemo(() => {
        const selected =
            selections[PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID] ?? [];
        const slug = selected.length === 1 ? selected[0] : undefined;
        if (!slug) return null;
        return library.linesBySlug[slug] ?? null;
    }, [selections, library.linesBySlug]);

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

    const countsByFacet = useMemo(
        () =>
            buildProductFacetCounts(library.items, library.facetCatalog.shared, {
                query: deferredQuery,
                selections,
            }),
        [library.items, library.facetCatalog.shared, deferredQuery, selections],
    );

    function onToggle(facetId: string, value: string) {
        const next = {
            ...selections,
            [facetId]: toggleValue(selections[facetId] ?? [], value),
        };
        if (next[facetId]?.length === 0) delete next[facetId];
        setDraftQuery('');
        writeParams({selections: next, visible: PAGE_SIZE, q: ''});
        if (!urlSync) {
            setLocalSelections(next);
            setLocalQuery('');
        }
    }

    function onReset() {
        setDraftQuery('');
        writeParams({
            q: '',
            selections: {},
            visible: PAGE_SIZE,
            clearFacetIds: Object.keys(selections),
        });
        if (!urlSync) {
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

    return (
        <PageDielineSection innerClassName="pb-24 pt-8 flex flex-col gap-8">
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
                sharedFacets={library.facetCatalog.shared}
                selections={selections}
                countsByFacet={countsByFacet}
                onToggle={onToggle}
                onReset={onReset}
            />

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                <ProductCatalogFilters
                    resultCount={filtered.length}
                    totalCount={library.items.length}
                    sharedFacets={library.facetCatalog.shared}
                    selections={selections}
                    countsByFacet={countsByFacet}
                    onToggle={onToggle}
                    onReset={onReset}
                />

                <div
                    className={cn(
                        'flex min-w-0 flex-1 flex-col gap-6 transition-opacity duration-(--motion-fast)',
                        (isSearchUpdating || isPending) &&
                            !isAppending &&
                            'pointer-events-none opacity-60',
                    )}
                    aria-busy={isPending || isAppending || isSearchUpdating}
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
