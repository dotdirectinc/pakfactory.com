'use client';

import type {MouseEvent} from 'react';

import {showToastCard} from '@/components/ui/toast-card';

export function stopCardAction(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
}

export function stubBookmarkAction(event: MouseEvent) {
    stopCardAction(event);
    showToastCard({
        title: 'Bookmarks',
        description: 'Coming soon.',
        dismissLabel: 'Dismiss',
    });
}

export function stubCompareAction(event: MouseEvent) {
    stopCardAction(event);
    showToastCard({
        title: 'Compare',
        description: 'Coming soon. Compare will work like Customizations.',
        dismissLabel: 'Dismiss',
    });
}

export async function sharePageUrl(event: MouseEvent, path: string) {
    stopCardAction(event);
    const url = `${window.location.origin}${path}`;
    try {
        await navigator.clipboard.writeText(url);
        showToastCard({
            title: 'Link copied',
            description: 'Page URL is on your clipboard.',
            dismissLabel: 'Dismiss',
        });
    } catch {
        showToastCard({
            title: "Couldn't copy link",
            description: 'Copy the URL from the address bar instead.',
            dismissLabel: 'Dismiss',
        });
    }
}
