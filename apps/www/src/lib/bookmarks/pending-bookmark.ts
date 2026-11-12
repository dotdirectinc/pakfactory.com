'use client';

import type {BookmarkInput} from '@/lib/bookmarks/bookmarks';

const PENDING_KEY = 'pf-pending-bookmark';

function isValidPending(raw: unknown): raw is BookmarkInput {
    if (raw == null || typeof raw !== 'object') return false;
    const input = raw as BookmarkInput;
    return (
        (input.type === 'product' || input.type === 'customization') &&
        typeof input.id === 'string' &&
        input.id.length > 0 &&
        input.snapshot != null &&
        typeof input.snapshot === 'object' &&
        typeof input.snapshot.title === 'string' &&
        typeof input.snapshot.href === 'string'
    );
}

/** Stash a bookmark to apply after the guest signs in. */
export function stashPendingBookmark(input: BookmarkInput): void {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(input));
    } catch {
        // Private mode / quota — gate still opens; user can bookmark again.
    }
}

export function clearPendingBookmark(): void {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.removeItem(PENDING_KEY);
    } catch {
        // ignore
    }
}

/** Read and clear the pending bookmark, or null if none / invalid. */
export function takePendingBookmark(): BookmarkInput | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.sessionStorage.getItem(PENDING_KEY);
        window.sessionStorage.removeItem(PENDING_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isValidPending(parsed) ? parsed : null;
    } catch {
        return null;
    }
}
