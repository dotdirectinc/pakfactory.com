'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
    BookOpen,
    Newspaper,
    Package,
    Palette,
    Search,
    Sparkles,
    TrendingUp,
    X,
    type LucideIcon,
} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';
import {Sheet, SheetContent, SheetDescription, SheetTitle} from '@pakfactory/ui/components/sheet';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    BROWSE_LINKS,
    CURATED_CHIPS,
    GROUP_LABELS,
    MAX_CHIPS,
    TYPE_LABELS,
} from '@/lib/search/search-browse';
import {
    MIN_QUERY_LENGTH,
    SEARCH_GROUPS,
    normalizeQuery,
    type SearchGroup,
    type SearchHit,
    type SearchResponse,
} from '@/lib/search/search-query';
import {useSearchRecents} from '@/lib/search/search-recents';
import {useSearchIdle, type SearchIdleData} from '@/lib/search/use-search-idle';
import {useSiteSearch, type SiteSearchState} from '@/lib/search/use-site-search';

import {useSiteSearchOpen} from './site-search-provider';
import {
    SiteSearchChips,
    SiteSearchSection,
    type SearchNavItem,
    type SearchSectionModel,
} from './site-search-section';

/**
 * The www ⌘K search (PROD-3111), after the POC (pakfactory.com-poc
 * `SiteSearch.jsx`): a dark dialog with a rail on desktop, a full-screen sheet
 * with Cancel below 768 px. Deviations from the POC (counts on the rail,
 * keyboard navigation, Resources instead of Materials, the site's own dark
 * tokens) are listed on PROD-2525.
 */

type RailId = 'trending' | SearchGroup;

const RAIL: {id: RailId; label: string; icon: LucideIcon}[] = [
    {id: 'trending', label: 'Trending', icon: TrendingUp},
    {id: 'products', label: 'Products', icon: Package},
    {id: 'solutions', label: 'Solutions', icon: Sparkles},
    {id: 'customizations', label: 'Customizations', icon: Palette},
    {id: 'guides', label: 'Guides', icon: BookOpen},
    {id: 'resources', label: 'Resources', icon: Newspaper},
];

const SECTION_LIMIT = {trending: 8, tab: 30};

function useIsMobile(breakpoint = 768) {
    const [mobile, setMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        const onChange = () => setMobile(mq.matches);
        onChange();
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [breakpoint]);
    return mobile;
}

function hitToItem(hit: SearchHit, queryID: string | null): SearchNavItem {
    return {
        id: hit.id,
        title: hit.title,
        href: hit.href,
        image: hit.image,
        imageAlt: hit.imageAlt,
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

function resultSections(data: SearchResponse, limit: number): SearchSectionModel[] {
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

type BrowseItem = NonNullable<SearchIdleData['browse']>['products'][number];

function browseItem(item: BrowseItem): SearchNavItem {
    return {
        id: item.id,
        title: item.title,
        href: item.href,
        image: item.image,
        imageAlt: item.imageAlt,
        summary: item.summary,
        label: TYPE_LABELS[item.type],
    };
}

const linkItems = (prefix: string, links: {label: string; href: string}[]): SearchNavItem[] =>
    links.map((link) => ({id: `${prefix}-${link.href}`, title: link.label, href: link.href}));

/**
 * Empty-state content per rail tab (rule-based picks from `/api/search/idle`,
 * see lib/search/search-browse-data.ts). Trending shows a few of each; a tab
 * shows its full set, then "Browse all" links to the catalog pages.
 */
function browseSections(
    rail: RailId,
    idle: SearchIdleData | null,
    showLines: boolean,
): SearchSectionModel[] {
    const b = idle?.browse;
    const trending = rail === 'trending';
    const take = <T,>(list: T[] | undefined, n: number) =>
        (list ?? []).slice(0, trending ? n : undefined);
    const sections: SearchSectionModel[] = [];
    const add = (section: SearchSectionModel) => {
        if (section.items.length) sections.push(section);
    };

    if (showLines && (trending || rail === 'products') && idle?.productLines.length) {
        add({
            key: 'lines',
            title: 'Product lines',
            variant: 'lines',
            items: idle.productLines.map((line) => ({
                id: `line-${line.href}`,
                title: line.title,
                // As in the POC, a product line runs a search for its name.
                query: line.title.toLowerCase(),
                image: line.image,
            })),
        });
    }
    if (trending || rail === 'products') {
        add({
            key: 'products',
            title: 'Products',
            variant: 'grid',
            items: take(b?.products, 4).map(browseItem),
        });
    }
    if (trending || rail === 'solutions') {
        // Most solutions have no image yet, so names rather than a grid of placeholders.
        add({
            key: 'solutions',
            title: 'Solutions',
            variant: 'pills',
            items: take(b?.solutions, 8).map(browseItem),
        });
    }
    if (trending || rail === 'customizations') {
        add({
            key: 'customization-categories',
            title: trending ? 'Customizations' : 'Categories',
            variant: 'pills',
            items: linkItems('category', b?.customizationCategories ?? []),
        });
        if (!trending) {
            add({
                key: 'customizations',
                title: 'Options',
                variant: 'pills',
                items: (b?.customizations ?? []).map(browseItem),
            });
        }
    }
    if (trending || rail === 'guides') {
        add({
            key: 'guides',
            title: trending ? 'Latest guides' : 'Guides',
            variant: 'cards',
            items: take(b?.guides, 2).map(browseItem),
        });
    }
    if (trending || rail === 'resources') {
        add({
            key: 'case-studies',
            title: 'Case studies',
            variant: 'cards',
            items: take(b?.caseStudies, 2).map(browseItem),
        });
        add({
            key: 'newsroom',
            title: 'Newsroom',
            variant: 'cards',
            items: take(b?.pressReleases, 1).map(browseItem),
        });
        if (!trending) {
            add({
                key: 'expertise',
                title: 'Expertise',
                variant: 'pills',
                items: (b?.expertise ?? []).map(browseItem),
            });
        }
    }
    if (trending) {
        add({
            key: 'quick',
            title: 'Quick links',
            variant: 'pills',
            items: linkItems('quick', idle?.quickLinks ?? []),
        });
    } else {
        add({
            key: 'all',
            title: 'Browse all',
            variant: 'pills',
            items: linkItems(`all-${rail}`, BROWSE_LINKS[rail]),
        });
    }
    return sections;
}

function StatusLine({state, query}: {state: SiteSearchState; query: string}) {
    let text: string | null = null;
    if (state.status === 'rate-limited') {
        text = 'Too many searches right now. Try again in a minute — or browse below.';
    } else if (state.status === 'error') {
        text = 'Search isn’t available right now. You can still browse below.';
    } else if (state.status === 'ready' && state.data.total === 0) {
        text = `No results for “${query}”.`;
    }
    if (!text) return null;
    return (
        <p className="text-sm text-muted-foreground" role="status">
            {text}
        </p>
    );
}

function SiteSearchBody({showRail, onClose}: {showRail: boolean; onClose: () => void}) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [rail, setRail] = useState<RailId>('trending');
    const [activeIndex, setActiveIndex] = useState(-1);
    const scrollRef = useRef<HTMLDivElement>(null);
    const {recents, push} = useSearchRecents();
    const idle = useSearchIdle(true);

    const normalized = normalizeQuery(query);
    const hasQuery = normalized.length >= MIN_QUERY_LENGTH;
    // Unfiltered query: results for Trending and the rail counts.
    const all = useSiteSearch(query, null);
    // Filtered query when a tab is open (same CDN-cached route).
    const tab = useSiteSearch(rail === 'trending' ? '' : query, rail === 'trending' ? null : rail);
    const current = rail === 'trending' ? all : tab;

    const chips = useMemo(() => {
        const recent = recents.map((r) => r.query);
        const curated = CURATED_CHIPS.filter(
            (c) => !recent.some((r) => r.toLowerCase() === c.toLowerCase()),
        );
        return [...recent, ...curated].slice(0, MAX_CHIPS);
    }, [recents]);

    const sections = useMemo<SearchSectionModel[]>(() => {
        if (hasQuery && current.status === 'ready' && current.data.total > 0) {
            return resultSections(
                current.data,
                rail === 'trending' ? SECTION_LIMIT.trending : SECTION_LIMIT.tab,
            );
        }
        // Typed but not answered yet (debounce or in flight), or no hits: show
        // nothing selectable, so ↓ + Enter can't open a stale browse link.
        if (hasQuery && current.status !== 'rate-limited' && current.status !== 'error') {
            return [];
        }
        // No query, rate-limited or failed: keep browse content visible.
        return browseSections(rail, idle, !showRail || rail === 'trending' || rail === 'products');
    }, [hasQuery, current, rail, idle, showRail]);

    const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

    useEffect(() => setActiveIndex(-1), [normalized, rail]);

    useEffect(() => {
        if (activeIndex < 0) return;
        scrollRef.current
            ?.querySelector(`[data-search-index="${activeIndex}"]`)
            ?.scrollIntoView({block: 'nearest'});
    }, [activeIndex]);

    function select(item: SearchNavItem) {
        if (item.query) {
            setQuery(item.query);
            push(item.query);
            setRail('trending');
            return;
        }
        if (!item.href) return;
        if (item.track) reportClick(item.track);
        if (hasQuery) push(normalized);
        onClose();
        if (/^https?:\/\//.test(item.href)) window.location.assign(item.href);
        else router.push(item.href);
    }

    function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (!flat.length) return;
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setActiveIndex((i) => (i + step + flat.length) % flat.length);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const item = flat[activeIndex];
            if (item) select(item);
            else if (hasQuery) push(normalized);
        }
    }

    const counts = hasQuery && all.status === 'ready' ? all.data.counts.group : null;

    let start = 0;
    const rendered = sections.map((section) => {
        const node = (
            <SiteSearchSection
                key={section.key}
                section={section}
                startIndex={start}
                activeIndex={activeIndex}
                onSelect={select}
            />
        );
        start += section.items.length;
        return node;
    });

    return (
        <div className="flex min-h-0 flex-1">
            {showRail ? (
                <nav
                    aria-label="Search sections"
                    className="flex w-48 shrink-0 flex-col gap-1 border-r border-border p-4"
                >
                    {RAIL.map(({id, label, icon: Icon}) => {
                        const active = rail === id;
                        const count =
                            id === 'trending' ? null : (counts?.[id] ?? (counts ? 0 : null));
                        return (
                            <button
                                key={id}
                                type="button"
                                aria-current={active ? 'true' : undefined}
                                onClick={() => setRail(id)}
                                className={cn(
                                    'flex h-9 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none',
                                    active
                                        ? 'bg-muted text-foreground'
                                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                                )}
                            >
                                <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                                <span className="flex-1 text-left">{label}</span>
                                {count !== null ? (
                                    <span className="text-xs tabular-nums text-muted-foreground">
                                        {count}
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}
                </nav>
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col">
                <div
                    className={cn(
                        'shrink-0 space-y-4 border-b border-border p-4',
                        showRail && 'pr-16',
                    )}
                >
                    <div className="flex items-center gap-2">
                        <div className="relative min-w-0 flex-1">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
                                strokeWidth={1.75}
                                aria-hidden
                            />
                            <input
                                autoFocus
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={onInputKeyDown}
                                placeholder="Search products, customizations, guides…"
                                aria-label="Search"
                                autoComplete="off"
                                enterKeyHint="search"
                                maxLength={80}
                                data-site-search-input=""
                                className="h-12 w-full rounded-lg border border-input bg-muted/40 pr-4 pl-10 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:outline-none md:text-sm [&::-webkit-search-cancel-button]:appearance-none"
                            />
                        </div>
                        {!showRail ? (
                            <Button type="button" variant="ghost" onClick={onClose}>
                                Cancel
                            </Button>
                        ) : null}
                    </div>
                    {!hasQuery ? (
                        <SiteSearchChips
                            chips={chips}
                            onSelect={(chip) => select({id: chip, title: chip, query: chip})}
                        />
                    ) : null}
                </div>

                <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
                    <div className="space-y-8 p-4 pb-8">
                        <StatusLine state={current} query={normalized} />
                        {hasQuery && (current.status === 'loading' || current.status === 'idle') ? (
                            <p className="text-sm text-muted-foreground" aria-live="polite">
                                Searching…
                            </p>
                        ) : null}
                        {rendered}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Mounted once in the site layout; opened by the header icon or ⌘K / Ctrl+K. */
export function SiteSearchDialog() {
    const {open, setOpen} = useSiteSearchOpen();
    const isMobile = useIsMobile();
    const close = () => setOpen(false);

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent
                    side="bottom"
                    showCloseButton={false}
                    className="inset-0 flex h-dvh w-full max-w-none flex-col gap-0 rounded-none border-0 bg-background p-0"
                    data-site-search-dialog=""
                >
                    <SheetTitle className="sr-only">Search</SheetTitle>
                    <SheetDescription className="sr-only">
                        Search products, solutions, customizations, guides and resources.
                    </SheetDescription>
                    {open ? <SiteSearchBody showRail={false} onClose={close} /> : null}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent
                showCloseButton={false}
                className="dark flex h-[min(720px,85vh)] w-[min(960px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden border-border bg-background p-0 text-foreground shadow-2xl sm:max-w-none"
                data-site-search-dialog=""
            >
                <DialogTitle className="sr-only">Search</DialogTitle>
                <DialogDescription className="sr-only">
                    Search products, solutions, customizations, guides and resources.
                </DialogDescription>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 z-10 size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Close search"
                    onClick={close}
                >
                    <X className="size-4" strokeWidth={1.75} />
                </Button>
                {open ? <SiteSearchBody showRail onClose={close} /> : null}
            </DialogContent>
        </Dialog>
    );
}
