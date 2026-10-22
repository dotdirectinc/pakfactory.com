'use client';

import {useEffect, useRef, useState, useTransition, type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {Search} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

import {GROUP_LABELS, TYPE_LABELS} from '@/lib/search/search-browse';
import {
    SEARCH_GROUPS,
    type SearchGroup,
    type SearchHit,
    type SearchResponse,
} from '@/lib/search/search-query';
import type {SiteSearchState} from '@/lib/search/use-site-search';

import {SiteSearchSection, type SearchNavItem, type SearchSectionModel} from './site-search-section';

/**
 * Pieces both search modes share (PROD-2525): the input, result shaping,
 * opening a result, and the section list. Mode-specific bodies live in
 * `site-search-basic.tsx` and `site-search-advanced.tsx`.
 */

export function hitToItem(hit: SearchHit, queryID: string | null): SearchNavItem {
    return {
        id: hit.id,
        title: hit.title,
        href: hit.href,
        image: hit.image,
        imageAlt: hit.imageAlt,
        ...(hit.hoverImage ? {hoverImage: hit.hoverImage} : {}),
        summary: hit.summary,
        label: TYPE_LABELS[hit.type],
        track: queryID ? {queryID, objectID: hit.id, position: hit.position} : undefined,
    };
}

/** Fire-and-forget; `keepalive` lets it finish while the page navigates. */
function reportClick(track: NonNullable<SearchNavItem['track']>) {
    try {
        void fetch('/api/search/click', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(track),
            keepalive: true,
        }).catch(() => {});
    } catch {
        // Analytics never blocks opening a result.
    }
}

const VARIANT: Record<SearchGroup, SearchSectionModel['variant']> = {
    products: 'grid',
    solutions: 'grid',
    customizations: 'pills',
    guides: 'cards',
    resources: 'cards',
};

/** One section per tab group, in rail order, each capped at `limit` hits. */
export function resultSections(data: SearchResponse, limit: number): SearchSectionModel[] {
    return data.groups
        .filter((g): g is {group: SearchGroup; hits: SearchHit[]} =>
            (SEARCH_GROUPS as readonly string[]).includes(g.group),
        )
        .map((g) => ({
            key: `results-${g.group}`,
            title: GROUP_LABELS[g.group],
            variant: VARIANT[g.group],
            items: g.hits.slice(0, limit).map((hit) => hitToItem(hit, data.queryID)),
        }));
}

export function StatusText({
    dark,
    live,
    children,
}: {
    dark: boolean;
    live?: boolean;
    children: ReactNode;
}) {
    return (
        <p
            className={cn('text-sm', dark ? 'text-white/50' : 'text-muted-foreground')}
            role={live ? undefined : 'status'}
            aria-live={live ? 'polite' : undefined}
        >
            {children}
        </p>
    );
}

/** Rate-limited, failed or empty answers; `texts` says what the visitor can still do. */
export function StatusLine({
    state,
    query,
    dark,
    texts,
}: {
    state: SiteSearchState;
    query: string;
    dark: boolean;
    texts: {rateLimited: string; error: string};
}) {
    let text: string | null = null;
    if (state.status === 'rate-limited') text = texts.rateLimited;
    else if (state.status === 'error') text = texts.error;
    else if (state.status === 'ready' && state.data.total === 0) {
        text = `No results for “${query}”.`;
    }
    return text ? <StatusText dark={dark}>{text}</StatusText> : null;
}

/**
 * Opening a result: the dialog stays up with the item marked "Opening…" until
 * the new page has rendered, then closes — instead of closing at once and
 * leaving the old page on screen while a cold page renders.
 */
export function useOpenResult(onClose: () => void) {
    const router = useRouter();
    const [navigating, startNavigation] = useTransition();
    const [pendingId, setPendingId] = useState<string | null>(null);
    useEffect(() => {
        if (pendingId && !navigating) onClose();
    }, [pendingId, navigating, onClose]);

    /** Warm the page while it's highlighted or hovered (production prefetch; dev ignores it). */
    const prefetched = useRef(new Set<string>());
    function prefetch(item: SearchNavItem | undefined) {
        const href = item?.href;
        if (!href || !href.startsWith('/') || prefetched.current.has(href)) return;
        prefetched.current.add(href);
        router.prefetch(href);
    }

    function open(item: SearchNavItem) {
        if (!item.href) return;
        if (item.track) reportClick(item.track);
        const href = item.href;
        if (/^https?:\/\//.test(href)) {
            // Blog guides live on another origin: a full page load.
            onClose();
            window.location.assign(href);
            return;
        }
        setPendingId(item.id);
        startNavigation(() => router.push(href));
    }

    return {pendingId, prefetch, open};
}

/** Arrow-key highlight over the flat item list; resets when `resetKey` changes. */
export function useActiveIndex(
    flat: SearchNavItem[],
    resetKey: string,
    onActive: (item: SearchNavItem | undefined) => void,
) {
    const [activeIndex, setActiveIndex] = useState(-1);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => setActiveIndex(-1), [resetKey]);

    useEffect(() => {
        if (activeIndex < 0) return;
        onActive(flat[activeIndex]);
        scrollRef.current
            ?.querySelector(`[data-search-index="${activeIndex}"]`)
            ?.scrollIntoView({block: 'nearest'});
        // Only when the highlight moves.
    }, [activeIndex]);

    /** Handles ↑/↓; returns true when it consumed the key. */
    function move(key: string): boolean {
        if (key !== 'ArrowDown' && key !== 'ArrowUp') return false;
        if (!flat.length) return true;
        const step = key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((i) => (i + step + flat.length) % flat.length);
        return true;
    }

    return {activeIndex, setActiveIndex, move, scrollRef};
}

/** Renders sections with a running arrow-key index across them. */
export function SectionList({
    sections,
    activeIndex,
    pendingId,
    dark,
    onSelect,
    onPrefetch,
    onRemove,
    highlight,
}: {
    sections: SearchSectionModel[];
    activeIndex: number;
    pendingId: string | null;
    dark: boolean;
    onSelect: (item: SearchNavItem) => void;
    onPrefetch: (item: SearchNavItem) => void;
    onRemove?: (item: SearchNavItem) => void;
    highlight?: string;
}) {
    let start = 0;
    return (
        <>
            {sections.map((section) => {
                const node = (
                    <SiteSearchSection
                        key={section.key}
                        section={section}
                        startIndex={start}
                        activeIndex={activeIndex}
                        pendingId={pendingId}
                        dark={dark}
                        onSelect={onSelect}
                        onPrefetch={onPrefetch}
                        onRemove={onRemove}
                        highlight={highlight}
                    />
                );
                start += section.items.length;
                return node;
            })}
        </>
    );
}

/** The search field (POC Input + `h-11 rounded-xl pl-9 text-sm`), dark and light. */
export function SearchInput({
    value,
    onChange,
    onKeyDown,
    onFocus,
    dark,
    activeDescendant,
}: {
    value: string;
    onChange: (value: string) => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onFocus?: () => void;
    dark: boolean;
    activeDescendant?: string;
}) {
    return (
        <div className="relative min-w-0 flex-1">
            <Search
                className={cn(
                    'pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2',
                    dark ? 'text-white/40' : 'text-muted-foreground',
                )}
                strokeWidth={1.75}
                aria-hidden
            />
            <input
                autoFocus
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                placeholder="Search products, customizations, guides…"
                aria-label="Search"
                aria-activedescendant={activeDescendant}
                autoComplete="off"
                enterKeyHint="search"
                maxLength={80}
                data-site-search-input=""
                className={cn(
                    'h-11 w-full min-w-0 rounded-[20px] border py-1 pr-2.5 pl-9 text-base transition-colors outline-none focus-visible:ring-3 md:text-sm [&::-webkit-search-cancel-button]:appearance-none',
                    dark
                        ? 'border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-white/30 focus-visible:ring-white/20'
                        : 'border-input bg-muted/50 text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50',
                )}
            />
        </div>
    );
}

/** Mobile sheet only: closes the full-screen search. */
export function CancelButton({onClick}: {onClick: () => void}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-[24px] px-2.5 text-sm font-medium whitespace-nowrap transition-all outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground/40"
        >
            Cancel
        </button>
    );
}
