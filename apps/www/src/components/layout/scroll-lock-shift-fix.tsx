'use client';

import {useEffect} from 'react';

/**
 * Radix RemoveScroll injects `body[data-scroll-locked] { margin-right: Npx
 * !important }` in a late stylesheet. That races `scrollbar-gutter: stable`
 * and shifts the page when Dialog/Select opens. Inline `!important` wins the
 * cascade; keep the html scrollbar column via globals `overflow-y: scroll`.
 */
function clearScrollLockGap() {
    if (!document.body.hasAttribute('data-scroll-locked')) return;
    document.body.style.setProperty('margin-right', '0px', 'important');
    document.body.style.setProperty('padding-right', '0px', 'important');
}

export function ScrollLockShiftFix() {
    useEffect(() => {
        clearScrollLockGap();
        const observer = new MutationObserver(clearScrollLockGap);
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['data-scroll-locked', 'style', 'class'],
        });
        return () => {
            observer.disconnect();
            document.body.style.removeProperty('margin-right');
            document.body.style.removeProperty('padding-right');
        };
    }, []);

    return null;
}
