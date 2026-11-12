'use client';

import type {MouseEvent} from 'react';

import {openLoginDialog} from '@/components/login/login-dialog-host';
import {showToastCard} from '@/components/ui/toast-card';
import {
    type BookmarkInput,
    toggleBookmark,
} from '@/lib/bookmarks/bookmarks';
import {
    clearPendingBookmark,
    stashPendingBookmark,
} from '@/lib/bookmarks/pending-bookmark';
import {stopCardAction} from '@/lib/catalog-card-actions';
import {WWW_ROUTES} from '@/lib/www-routes';

/** Pull `next` from a `/login?next=` href built by {@link useBookmarkAuth}. */
function returnPathFromLoginHref(loginHref: string): string {
    try {
        const url = new URL(loginHref, 'http://localhost');
        return url.searchParams.get('next')?.trim() || '/';
    } catch {
        return '/';
    }
}

/** Open the Welcome-back dialog so guests can sign in to bookmark. */
export function promptBookmarkSignIn(
    loginHref: string,
    pending?: BookmarkInput,
): void {
    const next = returnPathFromLoginHref(loginHref);
    if (pending) {
        stashPendingBookmark(pending);
    } else {
        clearPendingBookmark();
    }
    openLoginDialog({
        next,
        onDismiss: clearPendingBookmark,
    });
}

export function runBookmarkToggle(
    event: MouseEvent,
    input: BookmarkInput,
    options: {allowed: boolean; loginHref: string},
): boolean | null {
    stopCardAction(event);
    // Drop focus so group-focus-within does not keep card hover chrome stuck.
    const target = event.currentTarget;
    if (target instanceof HTMLElement) target.blur();
    if (!options.allowed) {
        promptBookmarkSignIn(options.loginHref, input);
        return null;
    }
    const bookmarked = toggleBookmark(input);
    if (bookmarked) {
        showToastCard({
            title: 'Bookmarked',
            description: input.snapshot.title,
            action: {label: 'View Bookmarks', href: WWW_ROUTES.bookmarks},
            dismissLabel: 'Dismiss',
        });
    } else {
        showToastCard({
            title: 'Bookmark removed',
            description: input.snapshot.title,
            dismissLabel: 'Dismiss',
        });
    }
    return bookmarked;
}
