'use client';

import {useEffect, useRef} from 'react';

import {showToastCard} from '@/components/ui/toast-card';
import {useNavAccount} from '@/lib/auth/use-nav-account';
import {
    isBookmarked,
    toggleBookmark,
} from '@/lib/bookmarks/bookmarks';
import {takePendingBookmark} from '@/lib/bookmarks/pending-bookmark';
import {WWW_ROUTES} from '@/lib/www-routes';

/**
 * After login/sign-up redirect, apply a bookmark the guest tried to save while
 * signed out (sessionStorage stash from the bookmark gate).
 */
export function BookmarkPendingFlush() {
    const session = useNavAccount();
    const flushed = useRef(false);

    useEffect(() => {
        if (flushed.current) return;
        if (session.status !== 'signed-in') return;
        flushed.current = true;

        const pending = takePendingBookmark();
        if (!pending) return;
        if (isBookmarked(pending.type, pending.id)) return;

        const bookmarked = toggleBookmark(pending);
        if (!bookmarked) return;

        showToastCard({
            title: 'Bookmarked',
            description: pending.snapshot.title,
            action: {label: 'View Bookmarks', href: WWW_ROUTES.bookmarks},
            dismissLabel: 'Dismiss',
        });
    }, [session.status]);

    return null;
}
