'use client';

import type {MouseEvent} from 'react';

import {showToastCard} from '@/components/ui/toast-card';
import {
    type BookmarkInput,
    toggleBookmark,
} from '@/lib/bookmarks/bookmarks';
import {stopCardAction} from '@/lib/catalog-card-actions';
import {WWW_ROUTES} from '@/lib/www-routes';

export function promptBookmarkSignIn(loginHref: string): void {
    showToastCard({
        title: 'Sign in to bookmark',
        description:
            'Create an account or sign in to bookmark products and customizations.',
        action: {label: 'Sign in', href: loginHref},
        dismissLabel: 'Dismiss',
    });
}

export function runBookmarkToggle(
    event: MouseEvent,
    input: BookmarkInput,
    options: {allowed: boolean; loginHref: string},
): boolean | null {
    stopCardAction(event);
    if (!options.allowed) {
        promptBookmarkSignIn(options.loginHref);
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
