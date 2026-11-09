'use client';

import {
    useCallback,
    useEffect,
    useState,
    useSyncExternalStore,
} from 'react';

const LISTS_KEY = 'pf-bookmark-lists';
const CHANGE_EVENT = 'pf-bookmark-lists';

export const DEFAULT_BOOKMARK_LIST_ID = 'default';
export const DEFAULT_BOOKMARK_LIST_NAME = 'Bookmarks';

export type BookmarkList = {
    id: string;
    name: string;
    createdAt: string;
};

type ListsState = {
    lists: BookmarkList[];
    activeListId: string;
};

function defaultState(): ListsState {
    return {
        lists: [
            {
                id: DEFAULT_BOOKMARK_LIST_ID,
                name: DEFAULT_BOOKMARK_LIST_NAME,
                createdAt: new Date(0).toISOString(),
            },
        ],
        activeListId: DEFAULT_BOOKMARK_LIST_ID,
    };
}

function normalizeLists(raw: unknown): ListsState {
    const fallback = defaultState();
    if (raw == null || typeof raw !== 'object') return fallback;
    const obj = raw as {lists?: unknown; activeListId?: unknown};
    const lists: BookmarkList[] = [];
    const seen = new Set<string>();
    if (Array.isArray(obj.lists)) {
        for (const item of obj.lists) {
            if (item == null || typeof item !== 'object') continue;
            const l = item as BookmarkList;
            if (typeof l.id !== 'string' || !l.id.trim()) continue;
            if (typeof l.name !== 'string' || !l.name.trim()) continue;
            if (seen.has(l.id)) continue;
            seen.add(l.id);
            lists.push({
                id: l.id,
                name: l.name.trim(),
                createdAt:
                    typeof l.createdAt === 'string'
                        ? l.createdAt
                        : new Date().toISOString(),
            });
        }
    }
    if (lists.length === 0) return fallback;
    if (!lists.some((l) => l.id === DEFAULT_BOOKMARK_LIST_ID)) {
        lists.unshift(fallback.lists[0]!);
    }
    const activeListId =
        typeof obj.activeListId === 'string' &&
        lists.some((l) => l.id === obj.activeListId)
            ? obj.activeListId
            : DEFAULT_BOOKMARK_LIST_ID;
    return {lists, activeListId};
}

export function getBookmarkListsState(): ListsState {
    if (typeof window === 'undefined') return defaultState();
    try {
        const raw = window.localStorage.getItem(LISTS_KEY);
        if (!raw) return defaultState();
        return normalizeLists(JSON.parse(raw));
    } catch {
        return defaultState();
    }
}

function writeListsState(state: ListsState): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LISTS_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getActiveBookmarkListId(): string {
    return getBookmarkListsState().activeListId;
}

export function setActiveBookmarkListId(id: string): void {
    const state = getBookmarkListsState();
    if (!state.lists.some((l) => l.id === id)) return;
    writeListsState({...state, activeListId: id});
}

export function createBookmarkList(name: string): BookmarkList | null {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const state = getBookmarkListsState();
    const id = `list-${Date.now().toString(36)}`;
    const list: BookmarkList = {
        id,
        name: trimmed,
        createdAt: new Date().toISOString(),
    };
    writeListsState({
        lists: [...state.lists, list],
        activeListId: id,
    });
    return list;
}

export function renameBookmarkList(id: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const state = getBookmarkListsState();
    writeListsState({
        ...state,
        lists: state.lists.map((l) =>
            l.id === id ? {...l, name: trimmed} : l,
        ),
    });
}

/** Deletes a non-default list. Caller should reassign or drop its entries. */
export function deleteBookmarkList(id: string): boolean {
    if (id === DEFAULT_BOOKMARK_LIST_ID) return false;
    const state = getBookmarkListsState();
    if (!state.lists.some((l) => l.id === id)) return false;
    const lists = state.lists.filter((l) => l.id !== id);
    writeListsState({
        lists,
        activeListId:
            state.activeListId === id
                ? DEFAULT_BOOKMARK_LIST_ID
                : state.activeListId,
    });
    return true;
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
    return JSON.stringify(getBookmarkListsState());
}

function getServerSnapshot(): string {
    return JSON.stringify(defaultState());
}

export function useBookmarkLists() {
    const snapshot = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
    );
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        setHydrated(true);
    }, []);
    const state: ListsState = hydrated
        ? JSON.parse(snapshot)
        : defaultState();

    return {
        lists: state.lists,
        activeListId: state.activeListId,
        setActiveListId: useCallback((id: string) => {
            setActiveBookmarkListId(id);
        }, []),
        createList: useCallback((name: string) => createBookmarkList(name), []),
        renameList: useCallback(
            (id: string, name: string) => renameBookmarkList(id, name),
            [],
        ),
        deleteList: useCallback((id: string) => deleteBookmarkList(id), []),
    };
}
