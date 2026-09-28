'use client';

import {useEffect, useSyncExternalStore} from 'react';
import {usePathname} from 'next/navigation';

const STORAGE_PREFIX = 'www:settle-once:';

function storageKey(pathname: string): string {
    return `${STORAGE_PREFIX}${pathname}`;
}

function readPlayed(pathname: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return sessionStorage.getItem(storageKey(pathname)) === '1';
    } catch {
        return false;
    }
}

function markPlayed(pathname: string): void {
    try {
        sessionStorage.setItem(storageKey(pathname), '1');
    } catch {
        // Private mode / quota — skip persistence; animation may replay.
    }
}

/** Subscribe no-ops: sessionStorage changes are local to this tab’s writes. */
function subscribe(): () => void {
    return () => {};
}

/**
 * Whether SectionReveal (and similar) should play settle for the current path.
 * First visit this tab session → true; after mark → false (Back / revisit).
 * Sync via useSyncExternalStore so Back does not flash a replay.
 */
export function usePathSettleOnce(): {enabled: boolean} {
    const pathname = usePathname() || '/';
    const played = useSyncExternalStore(
        subscribe,
        () => readPlayed(pathname),
        () => false,
    );
    const enabled = !played;

    useEffect(() => {
        if (!enabled) return;
        markPlayed(pathname);
    }, [enabled, pathname]);

    return {enabled};
}
