'use client';

import {
    createElement,
    Suspense,
    useCallback,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';

import {CompatibilityView} from '@/components/compatibility/compatibility-view';
import {
    buildCompatibilityPageModel,
    searchParamsFromRecord,
} from '@/lib/catalog/build-compatibility-page';
import {
    parseCompatibilityQuery,
    withCompatibilityQuery,
    type CompatibilityQuery,
    type CompatibilitySelection,
} from '@/lib/catalog/compatibility-query';
import {
    unpackCustomizationLibrary,
    unpackProductLibrary,
    type PackedCustomizationLibrary,
    type PackedProductLibrary,
} from '@/lib/catalog/library-wire';
import {
    unpackOfferIndex,
    type PackedProductOfferIndex,
} from '@/lib/catalog/offer-index-wire';
import {SearchParamsListener} from '@/lib/catalog/search-params-listener';
import {customizationCompatibilityHref} from '@/lib/www-routes';

export type CompatibilityEngineProps = {
    packedProductLibrary: PackedProductLibrary;
    packedCustomizationLibrary: PackedCustomizationLibrary;
    packedOfferIndex: PackedProductOfferIndex;
    /** Seed from the request URL (SSR + first paint). */
    initialSearchParams: Record<string, string | string[] | undefined>;
    pathSelection?: CompatibilitySelection;
    breadcrumbTail?: {label: string; href?: string}[];
    /** Optional page-builder sections rendered below the catalog. */
    below?: ReactNode;
};

function queriesEqual(a: CompatibilityQuery, b: CompatibilityQuery): boolean {
    if (a.variant !== b.variant) return false;
    if (a.selections.length !== b.selections.length) return false;
    if (a.properties.length !== b.properties.length) return false;
    for (let i = 0; i < a.selections.length; i++) {
        const left = a.selections[i]!;
        const right = b.selections[i]!;
        if (
            left.category !== right.category ||
            left.optionSlug !== right.optionSlug
        ) {
            return false;
        }
    }
    for (let i = 0; i < a.properties.length; i++) {
        const left = a.properties[i]!;
        const right = b.properties[i]!;
        if (
            left.category !== right.category ||
            left.optionSlug !== right.optionSlug ||
            left.propertyKey !== right.propertyKey ||
            left.valueSlugs.length !== right.valueSlugs.length ||
            left.valueSlugs.some((v, j) => v !== right.valueSlugs[j])
        ) {
            return false;
        }
    }
    return true;
}

/**
 * Client shell for compatibility filtering (PROD-2921).
 * Matches catalog strategy: in-memory rematch + `history.replaceState` — no RSC round trip.
 */
export function CompatibilityEngine({
    packedProductLibrary,
    packedCustomizationLibrary,
    packedOfferIndex,
    initialSearchParams,
    pathSelection,
    breadcrumbTail,
    below,
}: CompatibilityEngineProps) {
    const productLibrary = useMemo(
        () => unpackProductLibrary(packedProductLibrary),
        [packedProductLibrary],
    );
    const customizationLibrary = useMemo(
        () => unpackCustomizationLibrary(packedCustomizationLibrary),
        [packedCustomizationLibrary],
    );
    const offerIndex = useMemo(
        () => unpackOfferIndex(packedOfferIndex),
        [packedOfferIndex],
    );

    const [query, setQueryState] = useState<CompatibilityQuery>(() =>
        parseCompatibilityQuery(
            searchParamsFromRecord(initialSearchParams),
            {pathSelection},
        ),
    );
    /** Cleared once we mirror the engine URL (path option moves into the query). */
    const [scopedPathSelection, setScopedPathSelection] = useState(
        pathSelection,
    );

    const writingRef = useRef(false);

    const model = useMemo(
        () =>
            buildCompatibilityPageModel({
                query,
                pathSelection: scopedPathSelection,
                productLibrary,
                customizationLibrary,
                offerIndex,
            }),
        [
            query,
            scopedPathSelection,
            productLibrary,
            customizationLibrary,
            offerIndex,
        ],
    );

    const setQuery = useCallback((next: CompatibilityQuery) => {
        setScopedPathSelection(undefined);
        setQueryState(next);
        if (typeof window === 'undefined') return;
        const href = withCompatibilityQuery(
            customizationCompatibilityHref(),
            next,
        );
        const current = `${window.location.pathname}${window.location.search}`;
        if (href === current) return;
        writingRef.current = true;
        window.history.replaceState(window.history.state, '', href);
        queueMicrotask(() => {
            writingRef.current = false;
        });
    }, []);

    const applyUrl = useCallback(
        (searchParams: URLSearchParams) => {
            if (writingRef.current) return;
            const onEnginePath =
                typeof window !== 'undefined' &&
                window.location.pathname === customizationCompatibilityHref();
            const nextPath = onEnginePath ? undefined : pathSelection;
            setScopedPathSelection(nextPath);
            const next = parseCompatibilityQuery(searchParams, {
                pathSelection: nextPath,
            });
            setQueryState((prev) => (queriesEqual(prev, next) ? prev : next));
        },
        [pathSelection],
    );

    const urlSyncListener = createElement(
        Suspense,
        {fallback: null},
        createElement(SearchParamsListener, {onChange: applyUrl}),
    );

    return (
        <>
            {urlSyncListener}
            <CompatibilityView
                model={model}
                breadcrumbTail={breadcrumbTail}
                onQueryChange={setQuery}
            />
            {below}
        </>
    );
}
