'use client';

import {useCallback, useSyncExternalStore} from 'react';

import {parseCustomizationBookmarkId} from '@/lib/bookmarks/bookmark-id';
import {
    buildCompareSearch,
    COMPARE_CUSTOMIZATION_MAX,
} from '@/lib/compare/compare-ids';

export {buildCompareSearch, parseCompareIdsParam} from '@/lib/compare/compare-ids';

const CHANGE_EVENT = 'pf-compare-customizations';
const MAX = COMPARE_CUSTOMIZATION_MAX;

export type CompareCustomizationItem = {
    /** `categoryValue/slug` — same id as a customization bookmark. */
    id: string;
    title: string;
    href: string;
    imageUrl?: string | null;
    categoryValue: string;
    typeSlug?: string;
    typeTitle?: string;
    /** categoryValue — tray locks on library category; type is informational. */
    lockKey: string;
};

export type CompareAddResult =
    | {ok: true; items: CompareCustomizationItem[]}
    | {
          ok: false;
          reason: 'full' | 'mismatch' | 'invalid';
          items: CompareCustomizationItem[];
      };

let selected: CompareCustomizationItem[] = [];

function emit(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Tray lock key: same library category (Materials, Finishing, …). */
export function compareLockKey(item: {
    typeSlug?: string;
    categoryValue: string;
}): string {
    return item.categoryValue.trim();
}

export function getCompareCustomizations(): CompareCustomizationItem[] {
    return selected;
}

export function isCompareSelected(id: string): boolean {
    return selected.some((item) => item.id === id);
}

export function clearCompareCustomizations(): void {
    selected = [];
    emit();
}

export function removeCompareCustomization(id: string): void {
    selected = selected.filter((item) => item.id !== id);
    emit();
}

export function addCompareCustomization(
    item: Omit<CompareCustomizationItem, 'lockKey'> & {lockKey?: string},
): CompareAddResult {
    const id = item.id.trim();
    if (!id || !parseCustomizationBookmarkId(id)) {
        return {ok: false, reason: 'invalid', items: selected};
    }
    if (selected.some((e) => e.id === id)) {
        return {ok: true, items: selected};
    }
    if (selected.length >= MAX) {
        return {ok: false, reason: 'full', items: selected};
    }
    const lockKey = item.lockKey ?? compareLockKey(item);
    if (selected.length > 0 && selected[0]!.lockKey !== lockKey) {
        return {ok: false, reason: 'mismatch', items: selected};
    }
    selected = [
        ...selected,
        {
            id,
            title: item.title,
            href: item.href,
            imageUrl: item.imageUrl,
            categoryValue: item.categoryValue,
            ...(item.typeSlug ? {typeSlug: item.typeSlug} : {}),
            ...(item.typeTitle ? {typeTitle: item.typeTitle} : {}),
            lockKey,
        },
    ];
    emit();
    return {ok: true, items: selected};
}

export function toggleCompareCustomization(
    item: Omit<CompareCustomizationItem, 'lockKey'> & {lockKey?: string},
): CompareAddResult | {ok: true; removed: true; items: CompareCustomizationItem[]} {
    if (selected.some((e) => e.id === item.id)) {
        removeCompareCustomization(item.id);
        return {ok: true, removed: true, items: selected};
    }
    return addCompareCustomization(item);
}

function subscribe(onStoreChange: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = () => onStoreChange();
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
}

function getSnapshot(): string {
    return JSON.stringify(selected);
}

function getServerSnapshot(): string {
    return '[]';
}

export function useCompareCustomizations() {
    const snapshot = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
    );
    const items: CompareCustomizationItem[] = JSON.parse(snapshot);

    const isSelected = useCallback(
        (id: string) => items.some((e) => e.id === id),
        [items],
    );

    return {
        items,
        count: items.length,
        max: MAX,
        isSelected,
        add: addCompareCustomization,
        toggle: toggleCompareCustomization,
        remove: removeCompareCustomization,
        clear: clearCompareCustomizations,
        buildSearch: buildCompareSearch,
    };
}
