'use client';

import {useMemo, useState} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    MIN_QUERY_LENGTH,
    normalizeQuery,
    topHits,
    type SearchResponse,
} from '@/lib/search/search-query';
import {useSearchRecents} from '@/lib/search/search-recents';
import {useSiteSearch} from '@/lib/search/use-site-search';

import type {SearchNavItem, SearchSectionModel} from './site-search-section';
import {
    CancelButton,
    hitToItem,
    resultSections,
    SearchInput,
    SectionList,
    StatusLine,
    StatusText,
    useActiveIndex,
    useOpenResult,
} from './site-search-shared';

/**
 * Basic search mode, the default (PROD-2525, 2026-10-21). One column, no rail,
 * nothing recommended up front:
 *
 * 1. empty field → the visitor's own recent searches (localStorage), if any
 * 2. typing → a short list of loose matches (`match=loose`: typos, prefixes,
 *    and words dropped when all of them together find nothing)
 * 3. Enter, or "See all results" → every result for the query, grouped by type
 *
 * Steps 2 and 3 read the same `/api/search` response, so submitting costs no
 * extra request. Advanced mode (`site-search-advanced.tsx`) is the paused
 * first design.
 */

const SUGGESTION_LIMIT = 6;
const RESULT_LIMIT = 30;
const SEE_ALL_ID = '__see-all';

const TEXTS = {
    rateLimited: 'Too many searches right now. Try again in a minute.',
    error: 'Search isn’t available right now. Try again in a moment.',
};

function suggestionSections(data: SearchResponse, query: string): SearchSectionModel[] {
    const hits = topHits(data, SUGGESTION_LIMIT);
    if (!hits.length) return [];
    return [
        {
            key: 'suggestions',
            title: 'Suggestions',
            variant: 'list',
            hideTitle: true,
            items: [
                ...hits.map((hit) => hitToItem(hit, data.queryID)),
                {
                    id: SEE_ALL_ID,
                    title: `See all results for “${query}”`,
                    icon: 'search',
                },
            ],
        },
    ];
}

/** "12 results for “mailer”", or "Top 30 of 45 results…" when the page is capped. */
function resultsSummary(data: SearchResponse, query: string): string {
    const shown = data.groups.reduce((n, g) => n + g.hits.length, 0);
    const noun = data.total === 1 ? 'result' : 'results';
    return shown < data.total
        ? `Top ${shown} of ${data.total} ${noun} for “${query}”`
        : `${data.total} ${noun} for “${query}”`;
}

export function SiteSearchBasicBody({
    dark,
    showCancel,
    onClose,
}: {
    dark: boolean;
    /** Mobile sheet: a Cancel button beside the field (desktop has the dialog's ×). */
    showCancel: boolean;
    onClose: () => void;
}) {
    const [query, setQuery] = useState('');
    /** The query the visitor submitted (Enter / See all); null while typing. */
    const [submitted, setSubmitted] = useState<string | null>(null);
    const {recents, push, remove, clear} = useSearchRecents();

    const normalized = normalizeQuery(query);
    const hasQuery = normalized.length >= MIN_QUERY_LENGTH;
    const showAll = hasQuery && submitted === normalized;
    const search = useSiteSearch(query, null, 'loose');
    const answered =
        hasQuery && search.status === 'ready' && search.query === normalized ? search.data : null;

    const sections = useMemo<SearchSectionModel[]>(() => {
        if (!hasQuery) {
            if (!recents.length) return [];
            return [
                {
                    key: 'recent',
                    title: 'Recent searches',
                    variant: 'list',
                    action: {label: 'Clear', onClick: clear},
                    items: recents.map((r) => ({
                        id: `recent-${r.query}`,
                        title: r.query,
                        query: r.query,
                        icon: 'recent' as const,
                    })),
                },
            ];
        }
        // Nothing selectable until this query is answered, so ↓ + Enter can't
        // open a result for what was typed before.
        if (!answered || answered.total === 0) return [];
        return showAll
            ? resultSections(answered, RESULT_LIMIT)
            : suggestionSections(answered, normalized);
    }, [hasQuery, recents, clear, answered, showAll, normalized]);

    const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);
    const {pendingId, prefetch, open} = useOpenResult(onClose);
    const {activeIndex, move, scrollRef} = useActiveIndex(
        flat,
        `${normalized}|${showAll}`,
        prefetch,
    );

    function submit(raw: string) {
        const q = normalizeQuery(raw);
        if (q.length < MIN_QUERY_LENGTH) return;
        setQuery(q);
        setSubmitted(q);
        push(q);
    }

    function select(item: SearchNavItem) {
        if (item.id === SEE_ALL_ID) {
            submit(normalized);
            return;
        }
        if (item.query) {
            submit(item.query);
            return;
        }
        if (!item.href) return;
        push(normalized);
        open(item);
    }

    function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (move(event.key)) {
            event.preventDefault();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const item = flat[activeIndex];
            if (item) select(item);
            else submit(normalized);
        }
    }

    function onChange(value: string) {
        setQuery(value);
        // Editing after a submit goes back to suggestions.
        if (normalizeQuery(value) !== submitted) setSubmitted(null);
    }

    // Debouncing, in flight, or still holding the previous query's answer.
    const waiting =
        hasQuery &&
        !answered &&
        (search.status === 'loading' || search.status === 'idle' || search.status === 'ready');

    let status: React.ReactNode = null;
    if (pendingId) {
        status = <StatusText dark={dark}>Opening…</StatusText>;
    } else if (waiting) {
        status = (
            <StatusText dark={dark} live>
                Searching…
            </StatusText>
        );
    } else if (hasQuery) {
        status = <StatusLine state={search} query={normalized} dark={dark} texts={TEXTS} />;
    } else if (!recents.length) {
        status = (
            <StatusText dark={dark}>
                Search products, solutions, customizations, guides and resources.
            </StatusText>
        );
    }

    const showResultsHeader = showAll && answered && answered.total > 0 && !pendingId;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div
                className={cn(
                    'flex shrink-0 items-center gap-2 border-b p-4',
                    dark ? 'border-white/10' : 'border-border',
                    // Room for the dialog's close button.
                    !showCancel && 'pr-14',
                )}
            >
                <SearchInput value={query} onChange={onChange} onKeyDown={onInputKeyDown} dark={dark} />
                {showCancel ? <CancelButton onClick={onClose} /> : null}
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
                <div className={cn('p-4', showAll ? 'space-y-8 pb-10' : 'space-y-3')}>
                    {status}
                    {showResultsHeader ? (
                        <p
                            className={cn('text-sm', dark ? 'text-white/60' : 'text-muted-foreground')}
                            role="status"
                        >
                            {resultsSummary(answered, normalized)}
                        </p>
                    ) : null}
                    <SectionList
                        sections={sections}
                        activeIndex={activeIndex}
                        pendingId={pendingId}
                        dark={dark}
                        onSelect={select}
                        onPrefetch={prefetch}
                        onRemove={(item) => item.query && remove(item.query)}
                        highlight={showAll ? undefined : normalized}
                    />
                </div>
            </div>
        </div>
    );
}
