'use client';

import {useCallback, useEffect, useRef, useState} from 'react';

const DEFAULT_PAGE_SIZE = 12;
const DEFAULT_AUTO_REVEAL_LIMIT = 2;

export type UseProgressiveRevealOptions = {
    /** Total items after filtering. */
    total: number;
    pageSize?: number;
    /** Auto-reveal this many PAGE_SIZE batches via scroll before Load more. */
    autoRevealLimit?: number;
    /**
     * Delay before bumping `visible` so append skeletons can paint.
     * Prefer 0; a small value (~100) is only for visible skeleton flash.
     */
    appendDelayMs?: number;
    /** Bump this when filters/search change to reset to the first page. */
    resetKey?: string | number;
};

export type ProgressiveReveal = {
    visible: number;
    isAppending: boolean;
    appendCount: number;
    canAutoReveal: boolean;
    showLoadMore: boolean;
    revealNextBatch: () => void;
    sentinelRef: React.RefObject<HTMLDivElement | null>;
    reset: () => void;
};

/**
 * Session-only progressive reveal (IntersectionObserver auto-batches, then Load more).
 * Does not touch the URL.
 */
export function useProgressiveReveal({
    total,
    pageSize = DEFAULT_PAGE_SIZE,
    autoRevealLimit = DEFAULT_AUTO_REVEAL_LIMIT,
    appendDelayMs = 0,
    resetKey,
}: UseProgressiveRevealOptions): ProgressiveReveal {
    const [visible, setVisible] = useState(pageSize);
    const [appendCount, setAppendCount] = useState(0);
    const isAppending = appendCount > 0;

    const appendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const isAppendingRef = useRef(false);
    const pendingVisibleRef = useRef<number | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const autoRevealLockedRef = useRef(false);

    const clearAppend = useCallback(() => {
        if (appendTimeoutRef.current) {
            clearTimeout(appendTimeoutRef.current);
            appendTimeoutRef.current = null;
        }
        isAppendingRef.current = false;
        pendingVisibleRef.current = null;
        setAppendCount(0);
    }, []);

    const reset = useCallback(() => {
        clearAppend();
        setVisible(pageSize);
        autoRevealLockedRef.current = false;
    }, [clearAppend, pageSize]);

    useEffect(() => () => clearAppend(), [clearAppend]);

    useEffect(() => {
        reset();
        // resetKey intentionally drives a full reveal reset.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only when resetKey changes
    }, [resetKey]);

    useEffect(() => {
        if (!isAppendingRef.current) return;
        if (visible <= pageSize) {
            clearAppend();
            return;
        }
        if (
            pendingVisibleRef.current != null &&
            visible >= pendingVisibleRef.current
        ) {
            clearAppend();
        }
    }, [visible, pageSize, clearAppend]);

    const hasMore = visible < total;
    const autoLoadsDone = Math.max(
        0,
        Math.floor((visible - pageSize) / pageSize),
    );
    const canAutoReveal =
        !isAppending && hasMore && autoLoadsDone < autoRevealLimit;
    const showLoadMore =
        !isAppending && hasMore && autoLoadsDone >= autoRevealLimit;

    const revealNextBatch = useCallback(() => {
        if (isAppendingRef.current) return;
        if (visible >= total) return;

        const count = Math.min(pageSize, total - visible);
        const nextVisible = visible + pageSize;
        isAppendingRef.current = true;
        pendingVisibleRef.current = nextVisible;
        setAppendCount(count);

        const apply = () => {
            appendTimeoutRef.current = null;
            setVisible(nextVisible);
        };

        if (appendDelayMs <= 0) {
            apply();
            return;
        }

        appendTimeoutRef.current = setTimeout(apply, appendDelayMs);
    }, [visible, total, pageSize, appendDelayMs]);

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

    return {
        visible,
        isAppending,
        appendCount,
        canAutoReveal,
        showLoadMore,
        revealNextBatch,
        sentinelRef,
        reset,
    };
}
