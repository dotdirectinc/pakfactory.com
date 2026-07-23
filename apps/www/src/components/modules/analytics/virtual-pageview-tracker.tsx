"use client";

import {useEffect} from "react";
import {usePathname, useSearchParams} from "next/navigation";

import {captureEvent} from "@/lib/analytics";

/**
 * PROD-2191 — push `virtual_pageview` into GTM's dataLayer on first load and
 * every App Router client navigation (including /case-studies). Marketing owns
 * the GTM Custom Event trigger for pageview-scoped tags.
 *
 * Reads path/title/URL from the DOM after the new route's `<title>` settles
 * (or a short timeout), so we do not send the previous page's values.
 */
function afterTitleSettled(callback: () => void): () => void {
    let cancelled = false;
    let done = false;

    const finish = () => {
        if (cancelled || done) return;
        done = true;
        observer?.disconnect();
        callback();
    };

    const previousTitle = document.title;
    const titleEl = document.querySelector("title");
    let observer: MutationObserver | null = null;

    if (titleEl) {
        observer = new MutationObserver(() => {
            if (document.title !== previousTitle) finish();
        });
        observer.observe(titleEl, {
            childList: true,
            characterData: true,
            subtree: true,
        });
    }

    const timeout = window.setTimeout(finish, 150);

    return () => {
        cancelled = true;
        window.clearTimeout(timeout);
        observer?.disconnect();
    };
}

function pushVirtualPageview() {
    captureEvent("virtual_pageview", {
        page_path: `${window.location.pathname}${window.location.search}`,
        page_title: document.title,
        page_location: window.location.href,
    });
}

export function VirtualPageviewTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const search = searchParams.toString();

    useEffect(() => {
        return afterTitleSettled(pushVirtualPageview);
    }, [pathname, search]);

    return null;
}
