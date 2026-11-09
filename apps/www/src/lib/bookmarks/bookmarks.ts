'use client';

import {
    useCallback,
    useEffect,
    useState,
    useSyncExternalStore,
} from 'react';

import {
    customizationBookmarkId,
    parseCustomizationBookmarkId,
} from '@/lib/bookmarks/bookmark-id';
import {
    DEFAULT_BOOKMARK_LIST_ID,
    getActiveBookmarkListId,
} from '@/lib/bookmarks/bookmark-lists';

export {customizationBookmarkId, parseCustomizationBookmarkId};

const STORAGE_KEY = 'pf-bookmarks';
const CHANGE_EVENT = 'pf-bookmarks';

export type BookmarkKind = 'product' | 'customization';

export type BookmarkSnapshot = {
    title: string;
    href: string;
    imageUrl?: string | null;
    imageAlt?: string;
    /** Product line lock (products). */
    productLineSlug?: string;
    productLineTitle?: string;
    sku?: string;
    moq?: number;
    /** Customization lock / Apply path. */
    categoryValue?: string;
    typeSlug?: string;
    typeTitle?: string;
};

export type BookmarkEntry = {
    type: BookmarkKind;
    id: string;
    bookmarkedAt: string;
    snapshot: BookmarkSnapshot;
    /**
     * Named shortlist id (Bookmarks v2). Missing → default list.
     * v1 ignores this and shows the flat union of all entries.
     */
    listId?: string;
};

export type BookmarkInput = {
    type: BookmarkKind;
    id: string;
    snapshot: BookmarkSnapshot;
};

function isValidEntry(entry: unknown): entry is BookmarkEntry {
    if (entry == null || typeof entry !== 'object') return false;
    const e = entry as BookmarkEntry;
    return (
        (e.type === 'product' || e.type === 'customization') &&
        typeof e.id === 'string' &&
        e.id.length > 0 &&
        e.snapshot != null &&
        typeof e.snapshot === 'object' &&
        typeof e.snapshot.title === 'string' &&
        typeof e.snapshot.href === 'string'
    );
}

function normalizeBookmarks(raw: unknown): BookmarkEntry[] {
    if (!Array.isArray(raw)) return [];
    const out: BookmarkEntry[] = [];
    const seen = new Set<string>();
    for (const item of raw) {
        if (!isValidEntry(item)) continue;
        const key = `${item.type}:${item.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const listId =
            typeof item.listId === 'string' && item.listId.trim()
                ? item.listId.trim()
                : DEFAULT_BOOKMARK_LIST_ID;
        out.push({
            type: item.type,
            id: item.id,
            bookmarkedAt:
                typeof item.bookmarkedAt === 'string'
                    ? item.bookmarkedAt
                    : new Date().toISOString(),
            snapshot: item.snapshot,
            listId,
        });
    }
    return out;
}

/** Entries on one named shortlist (v2). Missing listId → default list. */
export function bookmarksInList(
    entries: BookmarkEntry[],
    listId: string,
): BookmarkEntry[] {
    const target = listId.trim() || DEFAULT_BOOKMARK_LIST_ID;
    return entries.filter(
        (e) => (e.listId ?? DEFAULT_BOOKMARK_LIST_ID) === target,
    );
}

export function getBookmarks(): BookmarkEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return normalizeBookmarks(JSON.parse(raw));
    } catch {
        return [];
    }
}

function writeBookmarks(entries: BookmarkEntry[]): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function isBookmarked(type: BookmarkKind, id: string): boolean {
    if (!type || !id) return false;
    return getBookmarks().some((e) => e.type === type && e.id === id);
}

/** @returns whether the item is bookmarked after the toggle */
export function toggleBookmark(input: BookmarkInput): boolean {
    const {type, id, snapshot} = input;
    if (!type || !id) return false;
    const entries = getBookmarks();
    const exists = entries.some((e) => e.type === type && e.id === id);
    if (exists) {
        writeBookmarks(entries.filter((e) => !(e.type === type && e.id === id)));
        return false;
    }
    writeBookmarks([
        ...entries,
        {
            type,
            id,
            bookmarkedAt: new Date().toISOString(),
            snapshot,
            listId: getActiveBookmarkListId(),
        },
    ]);
    return true;
}

export function removeBookmark(type: BookmarkKind, id: string): void {
    writeBookmarks(getBookmarks().filter((e) => !(e.type === type && e.id === id)));
}

export function moveBookmarkToList(
    type: BookmarkKind,
    id: string,
    listId: string,
): void {
    const target = listId.trim() || DEFAULT_BOOKMARK_LIST_ID;
    writeBookmarks(
        getBookmarks().map((e) =>
            e.type === type && e.id === id ? {...e, listId: target} : e,
        ),
    );
}

/** Drop every entry on a list (e.g. after deleting the list). */
export function removeBookmarksInList(listId: string): void {
    const target = listId.trim() || DEFAULT_BOOKMARK_LIST_ID;
    if (target === DEFAULT_BOOKMARK_LIST_ID) return;
    writeBookmarks(
        getBookmarks().filter(
            (e) => (e.listId ?? DEFAULT_BOOKMARK_LIST_ID) !== target,
        ),
    );
}

export function clearBookmarks(): void {
    writeBookmarks([]);
}

function subscribe(onStoreChange: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = () => onStoreChange();
    window.addEventListener('storage', handler);
    window.addEventListener(CHANGE_EVENT, handler);
    return () => {
        window.removeEventListener('storage', handler);
        window.removeEventListener(CHANGE_EVENT, handler);
    };
}

function getSnapshot(): string {
    return JSON.stringify(getBookmarks());
}

function getServerSnapshot(): string {
    return '[]';
}

export function useBookmarks() {
    const snapshot = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
    );
    // Avoid hydration mismatch: SSR and first paint stay empty until mount.
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        setHydrated(true);
    }, []);
    const bookmarks: BookmarkEntry[] = hydrated
        ? JSON.parse(snapshot)
        : [];

    const check = useCallback(
        (type: BookmarkKind, id: string) =>
            bookmarks.some((e) => e.type === type && e.id === id),
        [bookmarks],
    );

    const toggle = useCallback((input: BookmarkInput) => toggleBookmark(input), []);

    const remove = useCallback(
        (type: BookmarkKind, id: string) => removeBookmark(type, id),
        [],
    );

    const move = useCallback(
        (type: BookmarkKind, id: string, listId: string) =>
            moveBookmarkToList(type, id, listId),
        [],
    );

    const clear = useCallback(() => clearBookmarks(), []);

    return {
        bookmarks,
        isBookmarked: check,
        toggleBookmark: toggle,
        removeBookmark: remove,
        moveBookmarkToList: move,
        clearBookmarks: clear,
    };
}
