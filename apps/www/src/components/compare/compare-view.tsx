'use client';

/**
 * /compare (Website PRD v4.6 R27, R44, R46, R47): one comparison at a time — a product line
 * or a customization option type — up to 4 columns. Products / Customizations toggle and one
 * tab per group come from the visitor's own compare set; a shared link (`shared=1`) is
 * read-only and never changes the viewer's set ("Add these to my compare").
 *
 * Heroes paint from localStorage immediately; the spec matrix fills in from a slim API.
 */
import Link from 'next/link';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Bookmark, Check, ChevronDown, Columns2, HelpCircle, Share2, X} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@pakfactory/ui/components/dropdown-menu';
import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection, pageDielineContentClass, pageDielineOuterClass} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {ComparePageHeadingSection} from '@/components/compare/compare-page-heading-section';
import {TAB_TRIGGER_CLASS} from '@/components/ui/catalog-tab-bar';
import {serializeCompatibilityQuery} from '@/lib/catalog/compatibility-query';
import {defineRow, isEssentialRow} from '@/lib/compare/compare-glossary';
import {useQuickConfigure} from '@/components/quick-configure/quick-configure';
import {showToastCard} from '@/components/ui/toast-card';
import type {CompareColumn, CompareData} from '@/lib/compare/compare-data';
import {trackCompare} from '@/lib/compare/compare-events';
import {runBookmarkToggle} from '@/lib/bookmarks/bookmark-actions';
import {toggleBookmark, useBookmarks} from '@/lib/bookmarks/bookmarks';
import {useBookmarkAuth} from '@/lib/bookmarks/use-bookmark-auth';
import {parseCompareIds} from '@/lib/compare/compare-ids';
import {getCompareBehavior} from '@/lib/compare/compare-behavior';
import {productHref, WWW_ROUTES} from '@/lib/www-routes';
import {
    addManyToCompare,
    compareReturnHref,
    addToCompare,
    replaceInCompare,
    compareGroups,
    compareHref,
    groupId,
    removeFromCompare,
    setDockOpen,
    useCompareSet,
    type CompareGroup,
    type AddInput,
    type CompareItem,
    type CompareKind,
} from '@/lib/compare/compare-set';

type OtherProduct = {slug: string; title: string; imageUrl?: string | null; lineTitle?: string; available: string[]};

/** Owner Nov 9: the Key differences line (CMP-11) is hidden for now. */
const SHOW_KEY_DIFFERENCES = false;
/** Owner Nov 9: Essentials / All specs toggle hidden — every row shows, with plain-word definitions in Guided. */
const SHOW_VIEW_TOGGLE = false;
/** Owner Nov 9: the Works with summary row (options by type / product lines) is hidden. */
const SHOW_COMPAT_SUMMARY = false;

const kindOf = (type: 'products' | 'customizations'): CompareKind => (type === 'products' ? 'product' : 'customization');
const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
const idsKey = (ids: string[]) => ids.join(',');

function columnFromItem(item: CompareItem): CompareColumn {
    return {
        id: item.id,
        title: item.title,
        href: item.href,
        imageUrl: item.imageUrl ?? null,
        eyebrow: item.styleTitle ?? item.typeTitle,
        inspiration: item.inspiration,
        groupKey: item.groupKey,
        groupLabel: item.groupLabel,
        compatIds: [],
        compatSummary: '',
        ...(item.categoryValue ? {category: item.categoryValue} : {}),
        ...(item.kind === 'customization' && item.id.includes('/')
            ? {slug: item.id.slice(item.id.indexOf('/') + 1)}
            : {}),
    };
}

export function CompareView({
    type: typeProp,
    ids: idsProp,
    shared: sharedProp,
    guided = true,
}: {
    type: 'products' | 'customizations';
    ids: string[];
    shared: boolean;
    /** Compare spec §3: Guided (default) adds Essentials, definitions, Key differences, Choose this one. */
    guided?: boolean;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Prefer the live URL — server props can lag behind client navigations.
    const type = searchParams.get('type') === 'customizations' ? 'customizations' : typeProp;
    const ids = useMemo(() => {
        const fromUrl = parseCompareIds(searchParams.get('ids'));
        return fromUrl.length ? fromUrl : idsProp;
    }, [searchParams, idsProp]);
    const shared = searchParams.get('shared') === '1' || sharedProp;
    const quick = useQuickConfigure();
    const {items} = useCompareSet();
    const bookmarkAuth = useBookmarkAuth();
    const {isBookmarked} = useBookmarks();
    // CMP-10: Essentials / All specs, remembered in this browser.
    const [view, setViewState] = useState<'essentials' | 'all'>('essentials');
    useEffect(() => {
        try {
            if (window.localStorage.getItem('pf-compare-view') === 'all') setViewState('all');
        } catch {
            /* storage blocked */
        }
    }, []);
    const setView = (v: 'essentials' | 'all') => {
        setViewState(v);
        trackCompare('compare_action', {action: 'view', view: v});
        try {
            window.localStorage.setItem('pf-compare-view', v);
        } catch {
            /* storage blocked */
        }
    };
    const [diffOnly, setDiffOnly] = useState(false);
    const eView: 'essentials' | 'all' = SHOW_VIEW_TOGGLE ? view : 'all';
    /** "Choose this one" (CMP-13) or "Add to Quote with…" chooser (CMP-9) for one column. */
    const [sheet, setSheet] = useState<{mode: 'choose' | 'with'; col: CompareColumn} | null>(null);
    const kind = kindOf(type);
    const groups = useMemo(() => compareGroups(items), [items]);
    const mine = useMemo(() => groups.filter((g) => g.kind === kind), [groups, kind]);
    const count = (k: CompareKind) => items.filter((i) => i.kind === k).length;
    const active = mine.find((g) => sameIds(g.items.map((i) => i.id), ids));
    const readOnly = shared || (!active && ids.length > 0);

    // Stable href for the no-ids redirect — keyed by group membership, not array identity.
    const redirectTarget = useMemo(() => {
        if (ids.length) return '';
        const first = mine[0] ?? groups[0];
        return first ? compareHref(first) : '';
    }, [
        ids.length,
        // Membership string stays stable across identical renders.
        mine.map((g) => `${g.kind}:${g.key}:${g.items.map((i) => i.id).join(',')}`).join('|'),
        groups.map((g) => `${g.kind}:${g.key}:${g.items.map((i) => i.id).join(',')}`).join('|'),
    ]);

    useEffect(() => {
        if (redirectTarget) router.replace(redirectTarget);
    }, [redirectTarget, router]);

    const storeColumns = useMemo(() => {
        if (!ids.length) return [] as CompareColumn[];
        if (active) return active.items.map(columnFromItem);
        return ids.flatMap((id) => {
            const item = items.find((i) => i.kind === kind && i.id === id);
            return item ? [columnFromItem(item)] : [];
        });
    }, [ids, active, items, kind]);

    const [matrix, setMatrix] = useState<CompareData | null>(null);
    const [matrixLoading, setMatrixLoading] = useState(false);

    useEffect(() => {
        if (!ids.length) {
            setMatrix(null);
            setMatrixLoading(false);
            return;
        }
        let off = false;
        setMatrixLoading(true);
        const q = new URLSearchParams({type, ids: ids.join(',')});
        fetch(`/api/compare/matrix?${q.toString()}`)
            .then((r) => (r.ok ? r.json() : {data: null}))
            .then((j: {data: CompareData | null}) => {
                if (off) return;
                setMatrix(j.data ?? null);
                setMatrixLoading(false);
            })
            .catch(() => {
                if (off) return;
                setMatrix(null);
                setMatrixLoading(false);
            });
        return () => {
            off = true;
        };
    }, [type, idsKey(ids)]);

    // R47: compare_view once per comparison when matrix columns arrive.
    useEffect(() => {
        if (matrix?.columns.length) trackCompare('compare_view', {type, group_size: matrix.columns.length, shared});
    }, [type, matrix, shared]);

    // R46: the visitor's other comparison, for the ✓/✗ cross-check.
    const otherCustomizations = items.filter((i) => i.kind === 'customization');
    const otherProductIds = items.filter((i) => i.kind === 'product').map((i) => i.id).join(',');
    const [otherProducts, setOtherProducts] = useState<OtherProduct[]>([]);
    useEffect(() => {
        if (type !== 'customizations' || !otherProductIds) return setOtherProducts([]);
        let off = false;
        fetch(`/api/compare/products?ids=${encodeURIComponent(otherProductIds)}`)
            .then((r) => (r.ok ? r.json() : {products: []}))
            .then((j: {products: OtherProduct[]}) => !off && setOtherProducts(j.products ?? []))
            .catch(() => !off && setOtherProducts([]));
        return () => {
            off = true;
        };
    }, [type, otherProductIds]);

    const switchTo = (k: CompareKind) => {
        const g = groups.find((x) => x.kind === k);
        // replace, not push: switching tabs doesn't pile up history (Close goes back to where compare was opened).
        if (g) router.replace(compareHref(g));
    };
    const openGroup = (g: CompareGroup) => router.replace(compareHref(g));
    const remove = (id: string) => {
        removeFromCompare(kind, id);
        const left = ids.filter((x) => x !== id);
        router.replace(left.length ? `/compare?type=${type}&ids=${encodeURIComponent(left.join(','))}` : '/compare');
    };
    const share = async () => {
        const url = `${window.location.origin}/compare?type=${type}&ids=${encodeURIComponent(ids.join(','))}&shared=1`;
        trackCompare('compare_action', {action: 'share', type, group_size: ids.length});
        try {
            await navigator.clipboard.writeText(url);
            showToastCard({title: 'Link copied', description: 'Anyone with the link sees this comparison, read-only.', dismissLabel: 'Dismiss'});
        } catch {
            showToastCard({title: 'Share this link', description: url, dismissLabel: 'Dismiss'});
        }
    };
    const closeCompare = () => {
        // Collapse the dock too — return to the previous page with the round button only.
        setDockOpen(false);
        // Owner Nov 9: back to the page compare was opened from, however many tabs were switched here.
        const back = compareReturnHref();
        if (back) {
            router.push(back);
            return;
        }
        router.push(type === 'customizations' ? '/customizations' : '/products');
    };
    const addTheseToMine = () => {
        const source = matrix?.columns.length ? matrix.columns : storeColumns;
        if (!source.length) return;
        addManyToCompare(
            source.map((c) => ({
                kind,
                id: c.id,
                title: c.title,
                href: c.href,
                imageUrl: c.imageUrl ?? null,
                groupKey: c.groupKey,
                groupLabel: c.groupLabel,
                ...(c.eyebrow ? (kind === 'product' ? {styleTitle: c.eyebrow} : {typeTitle: c.eyebrow}) : {}),
                ...(c.inspiration ? {inspiration: true} : {}),
                ...(c.category ? {categoryValue: c.category} : {}),
            })),
        );
        showToastCard({title: 'Added to your compare', description: `${source.length} items`, dismissLabel: 'Dismiss'});
    };

    // Prefer matrix columns when ready (compat + accurate brows); else store heroes.
    const cols = matrix?.columns.length ? matrix.columns : storeColumns;

    // CMP-8: the "Available customizations" count is dropped (Works with covers it). CMP-10: Essentials / All specs.
    const allRows = (matrix?.rows ?? []).filter((r) => r.key !== 'available');
    const differsRow = (r: {values: Record<string, string>}) => cols.length > 1 && new Set(cols.map((c) => r.values[c.id]?.trim() ?? '')).size > 1;
    const shownRows = allRows.filter((r, i) => {
        if (guided && eView === 'essentials' && !isEssentialRow(type, r.label, i)) return false;
        if (diffOnly && !differsRow(r)) return false;
        return true;
    });
    // CMP-11: one line from the rows — what differs, what's the same.
    const keyDiff = (() => {
        if (!guided || cols.length < 2 || !allRows.length) return '';
        const lc = (s: string) => s.trim().toLowerCase();
        const join = (a: string[]) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}` : a[0] ?? '');
        const rows = allRows.filter((r) => r.key !== 'preselected');
        const differ = rows.filter(differsRow).map((r) => lc(r.label));
        const same = rows.filter((r) => !differsRow(r) && cols.every((c) => r.values[c.id]?.trim())).map((r) => lc(r.label));
        if (!differ.length) return 'These match on everything we list. Ask us about what sets them apart.';
        return `These differ in ${join(differ)}.${same.length ? ` Same ${join(same)}.` : ''}`;
    })();
    // CMP-9: options in the visitor's set that this box takes (✓ only).
    const withOptions = (c: CompareColumn): WithOption[] =>
        otherCustomizations
            .filter((o) => c.compatIds.includes(o.id) && o.id.includes('/'))
            .map((o) => ({id: o.id, title: o.title, category: o.id.slice(0, o.id.indexOf('/')), slug: o.id.slice(o.id.indexOf('/') + 1)}));
    const withLabel = (c: CompareColumn) => {
        const list = withOptions(c);
        const clash = new Set(list.map((o) => o.category)).size < list.length;
        return clash ? 'options you’re comparing…' : list.map((o) => o.title).join(' + ');
    };
    const openQuote = (c: CompareColumn, picks: WithOption[]) => {
        const query = picks.length ? serializeCompatibilityQuery({selections: picks.map((o) => ({category: o.category, optionSlug: o.slug})), properties: []}) : '';
        if (quick.enabled) {
            quick.open({slug: c.id, title: c.title, ...(query ? {query} : {})});
            return;
        }
        router.push(query ? `${c.href}?${query}` : c.href);
    };
    const addWith = (c: CompareColumn) => {
        const list = withOptions(c);
        if (new Set(list.map((o) => o.category)).size < list.length) {
            setSheet({mode: 'with', col: c});
            return;
        }
        trackCompare('compare_action', {action: 'add_with', id: c.id, options: list.length, shared});
        openQuote(c, list);
    };
    // Owner Nov 9: at least 4 columns (empty ones invite "＋ Add a box"); one more slot while under the
    // configured max (4 by default, later a Sanity setting). Past 4, the table scrolls sideways.
    const max = getCompareBehavior().maxPerGroup;
    const emptySlots = readOnly ? 0 : cols.length < 4 ? 4 - cols.length : cols.length < max ? 1 : 0;
    const empties = Array.from({length: emptySlots}, (_, i) => i);
    const slotCount = cols.length + emptySlots;
    const tpl = {gridTemplateColumns: `var(--cmp-label) repeat(${slotCount}, minmax(var(--cmp-col), 1fr))`};
    const tableVars = '[--cmp-label:8.5rem] [--cmp-col:42vw] sm:[--cmp-label:13rem] sm:[--cmp-col:13.5rem]';
    const cell = 'border-r border-dashed border-border px-4 py-3 text-sm last:border-r-0';
    const labelCell = (node: ReactNode, tint = false) => (
        <div className={cn('sticky left-0 z-10 border-r border-dashed border-border py-3 pl-layout-gutter-inner pr-3', tint ? 'bg-muted' : 'bg-background')}>{node}</div>
    );
    const groupHref = active ? (kind === 'product' ? productHref(active.key) : WWW_ROUTES.customizations) : type === 'products' ? WWW_ROUTES.products : WWW_ROUTES.customizations;
    const noun = type === 'products' ? 'box' : 'option';

    // Suggestions for the empty slots (Guided): the closest items from the same line / option type.
    const [slotSugg, setSlotSugg] = useState<AddInput[]>([]);
    const firstId = cols[0]?.id ?? '';
    useEffect(() => {
        if (!guided || readOnly || !firstId || cols.length >= max) return setSlotSugg([]);
        let off = false;
        fetch(`/api/compare/suggest?kind=${kind}&id=${encodeURIComponent(firstId)}&exclude=${encodeURIComponent(ids.join(','))}`)
            .then((r) => (r.ok ? r.json() : {items: []}))
            .then((j: {items: AddInput[]}) => !off && setSlotSugg(j.items ?? []))
            .catch(() => !off && setSlotSugg([]));
        return () => {
            off = true;
        };
    }, [guided, readOnly, firstId, kind, idsKey(ids), max]);
    // Owner Nov 9 (as the original compare): the column title is a dropdown to switch that column to
    // another item of the same line / option type.
    const [groupItems, setGroupItems] = useState<AddInput[]>([]);
    useEffect(() => {
        if (readOnly || !firstId) return setGroupItems([]);
        let off = false;
        fetch(`/api/compare/suggest?kind=${kind}&id=${encodeURIComponent(firstId)}&scope=group`)
            .then((r) => (r.ok ? r.json() : {items: []}))
            .then((j: {items: AddInput[]}) => !off && setGroupItems(j.items ?? []))
            .catch(() => !off && setGroupItems([]));
        return () => {
            off = true;
        };
    }, [readOnly, firstId, kind]);
    const switchColumn = (oldId: string, next: AddInput) => {
        replaceInCompare(kind, oldId, next);
        router.replace(`/compare?type=${type}&ids=${encodeURIComponent(ids.map((x) => (x === oldId ? next.id : x)).join(','))}`);
    };
    const addHere = (s: AddInput) => {
        addToCompare(s);
        trackCompare('compare_action', {action: 'add_from_compare', id: s.id});
        router.replace(`/compare?type=${type}&ids=${encodeURIComponent([...ids, s.id].join(','))}`);
    };
    // Sticky column heads: once the image row scrolls away, a slim strip (thumb + name) pins to the top.
    const scrollerRef = useRef<HTMLDivElement>(null);
    const heroRef = useRef<HTMLDivElement>(null);
    const [scrollX, setScrollX] = useState(0);
    const [stuck, setStuck] = useState(false);
    const [headTop, setHeadTop] = useState(0);
    const showHeroesKey = `${ids.join(',')}|${Boolean(matrix)}`;
    // A scroll listener (capture: also scrolls inside any scrolling ancestor): pinned once the image row's
    // bottom passes the top of the viewport (or the bottom of a sticky bar above it, if there is one).
    useEffect(() => {
        const check = () => {
            const el = heroRef.current;
            if (!el) return setStuck(false);
            const bar = document.querySelector('[aria-label="Products or customizations"]')?.closest('.sticky') as HTMLElement | null;
            const top = bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
            setHeadTop((t) => (t === top ? t : top));
            setStuck(el.getBoundingClientRect().bottom < top + 8);
        };
        check();
        window.addEventListener('scroll', check, {capture: true, passive: true});
        window.addEventListener('resize', check);
        return () => {
            window.removeEventListener('scroll', check, {capture: true});
            window.removeEventListener('resize', check);
        };
    }, [showHeroesKey]);

    const setEmpty = items.length === 0 && !shared;
    const awaitingRedirect = !ids.length && Boolean(redirectTarget);
    const awaitingColumns = ids.length > 0 && !cols.length && (matrixLoading || items.length > 0);
    const empty = setEmpty && !ids.length && !awaitingRedirect;
    const showHeroes = cols.length > 0;
    const heading =
        active?.label ??
        matrix?.columns[0]?.groupLabel ??
        storeColumns[0]?.groupLabel ??
        (type === 'products' ? 'Products' : 'Customizations');

    return (
        <div className="relative min-h-svh bg-background">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end p-5">
                {/* Owner Nov 9: Close (✕) top-right — /compare is a tool you close back to where you were. Solid black like the chat button, same size and right edge (size-12, right-5); no shadow. */}
                <Button
                    type="button"
                    size="icon"
                    className="pointer-events-auto size-12 rounded-full border-0 bg-foreground text-background shadow-none hover:bg-foreground hover:opacity-90"
                    onClick={closeCompare}
                    aria-label="Close compare"
                    title="Close compare"
                >
                    <X className="size-5" aria-hidden />
                </Button>
            </div>
            <ComparePageHeadingSection
                title={heading}
                settle
                actions={
                    <>
                        {showHeroes ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={share}
                            >
                                <Share2 className="size-4" aria-hidden /> Share
                            </Button>
                        ) : null}
                    </>
                }
            />
            {/* Owner Nov 9: level 1 of the two-level bar in its own page section — the catalog tab strip
                (Products / Customizations, view controls far right), full-bleed dashed rule below. */}
            {/* Owner Nov 9: not sticky — only the column titles pin on scroll. */}
            <div className="bg-background">
                <PageDielineSection paddingBlock="none" borderBottom>
                    <div className="flex items-stretch justify-between gap-x-4 sm:gap-x-6">
                        <div role="tablist" aria-label="Products or customizations" className="-mb-px flex min-w-0 flex-1 gap-x-4 overflow-x-auto sm:gap-x-6">
                            {(['product', 'customization'] as const).map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    role="tab"
                                    aria-selected={kind === k}
                                    data-state={kind === k ? 'active' : 'inactive'}
                                    disabled={!count(k) && kind !== k}
                                    onClick={() => kind !== k && switchTo(k)}
                                    className={cn('flex items-center disabled:opacity-40', TAB_TRIGGER_CLASS)}
                                >
                                    <span>{k === 'product' ? 'Products' : 'Customizations'}</span>
                                    <span className="font-normal tabular-nums text-muted-foreground/50">{count(k)}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex shrink-0 items-center gap-1 py-2">
                            {SHOW_VIEW_TOGGLE && guided && showHeroes ? (
                                <div className="flex rounded-lg border border-border p-0.5" role="group" aria-label="How much to show">
                                    {(['essentials', 'all'] as const).map((v) => (
                                        <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={cn('rounded-md px-3 py-1 text-sm font-medium', view === v ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>
                                            {v === 'essentials' ? 'Essentials' : 'All specs'}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </PageDielineSection>
            </div>
            <PageDielineSection paddingBlock="none" innerClassName="pb-16 sm:pb-20">
                {mine.length > 0 ? (
                    <div className="-mx-layout-gutter-inner flex items-stretch justify-between gap-x-4 border-b border-dashed border-border px-layout-gutter-inner sm:gap-x-6">
                    {/* Owner Nov 9: same strip as level 1 (type, underline, spacing); Show differences only on the right. */}
                    <div className="-mb-px flex min-w-0 flex-1 gap-x-4 overflow-x-auto sm:gap-x-6" role="tablist" aria-label="Your comparisons">
                        {mine.map((g) => {
                            const on = active && groupId(active.kind, active.key) === groupId(g.kind, g.key);
                            return (
                                <button
                                    key={groupId(g.kind, g.key)}
                                    type="button"
                                    role="tab"
                                    aria-selected={Boolean(on)}
                                    data-state={on ? 'active' : 'inactive'}
                                    onClick={() => openGroup(g)}
                                    className={cn('-mb-px flex shrink-0 items-center', TAB_TRIGGER_CLASS)}
                                >
                                    <span>{g.label}</span>
                                    <span className="font-normal tabular-nums text-muted-foreground/50">{g.items.length}</span>
                                </button>
                            );
                        })}
                    </div>
                    {showHeroes && cols.length > 1 ? (
                        <label className="flex shrink-0 items-center gap-2 py-2 text-sm">
                            <input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} className="size-4" />
                            Show differences only
                        </label>
                    ) : null}
                    </div>
                ) : null}

                {readOnly && showHeroes ? (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm">
                        <span>Shared comparison · read-only. Your own compare list isn't changed.</span>
                        <Button type="button" size="sm" onClick={addTheseToMine}>
                            Add these to my compare
                        </Button>
                    </div>
                ) : null}

                {empty ? (
                    <div className="mx-auto mt-16 max-w-md text-center">
                        <Columns2 className="mx-auto size-8 text-muted-foreground" aria-hidden />
                        <h2 className="mt-3 text-lg font-semibold">Nothing to compare yet</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Use “Add to compare” on any product or customization. Items group themselves; open a group here to see it side by side.</p>
                        <div className="mt-5 flex justify-center gap-2">
                            <Button asChild variant="outline"><Link href="/products">Browse products</Link></Button>
                            <Button asChild variant="outline"><Link href="/customizations">Browse customizations</Link></Button>
                        </div>
                    </div>
                ) : awaitingRedirect || awaitingColumns ? (
                    <div className="mx-auto mt-16 max-w-md text-center" aria-busy="true">
                        <p className="text-sm text-muted-foreground">
                            {awaitingRedirect ? 'Opening your comparison…' : 'Loading comparison…'}
                        </p>
                    </div>
                ) : showHeroes ? (
                    <div>
                        {/* Owner Nov 9: Key differences hidden for now (CMP-11); flip SHOW_KEY_DIFFERENCES to bring it back. */}
                        {SHOW_KEY_DIFFERENCES && guided && keyDiff ? (
                            <p className="rounded-r-xl border-l-[3px] border-primary bg-primary/5 px-4 py-3 text-sm">
                                <span className="font-semibold">Key differences:</span> {keyDiff}
                            </p>
                        ) : null}

                        {/* Portal: the page's enter animation sets a transform, which would pin a fixed strip to the page instead of the viewport. */}
                        {stuck && typeof document !== 'undefined'
                            ? createPortal(
                            <div className={pageDielineOuterClass('fixed inset-x-0 z-40 border-b border-dashed border-border bg-background/95 backdrop-blur')} style={{top: headTop}}>
                                <div className={pageDielineContentClass(cn('flex', tableVars))}>
                                    <div className="-mx-layout-gutter-inner flex min-w-0 flex-1">
                                    <div className="w-[var(--cmp-label)] shrink-0" />
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <div className="grid" style={{gridTemplateColumns: `repeat(${slotCount}, minmax(var(--cmp-col), 1fr))`, transform: `translateX(-${scrollX}px)`}}>
                                            {cols.map((c) => (
                                                <div key={c.id} className="flex items-center gap-2 px-4 py-2">
                                                    <span className="size-8 shrink-0 overflow-hidden rounded-md bg-muted">{c.imageUrl ? <img src={c.imageUrl} alt="" className="size-full object-cover" /> : null}</span>
                                                    <span className="truncate text-[13px] font-semibold">{c.title}</span>
                                                </div>
                                            ))}
                                            {empties.map((i) => <div key={`e${i}`} />)}
                                        </div>
                                    </div>
                                    </div>
                                </div>
                            </div>,
                                  document.body,
                              )
                            : null}

                        {/* Owner Nov 9: rows run to the dieline's dashed edges, so every dashed line connects. */}
                        <div ref={scrollerRef} onScroll={(e) => setScrollX(e.currentTarget.scrollLeft)} className={cn('-mx-layout-gutter-inner overflow-x-auto', tableVars)}>
                            <div className="min-w-full">
                                {/* Column heads: image, name, remove. Empty slots invite one more (Guided: a suggestion). */}
                                <div ref={heroRef} className="grid border-b border-dashed border-border" style={tpl}>
                                    {labelCell(
                                        <span className="text-[12px] text-muted-foreground">
                                            {cols.length} of {max}
                                        </span>,
                                    )}
                                    {cols.map((c) => (
                                        <div key={c.id} className="relative flex flex-col gap-2 border-r border-dashed border-border px-4 pb-5 pt-4 last:border-r-0">
                                            {!readOnly ? (
                                                <button type="button" onClick={() => remove(c.id)} aria-label={`Remove ${c.title}`} className="absolute right-6 top-6 z-10 flex size-7 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm hover:text-foreground">
                                                    <X className="size-4" aria-hidden />
                                                </button>
                                            ) : null}
                                            <Link href={c.href} className="block h-36 overflow-hidden rounded-xl bg-muted sm:h-44" aria-label={c.title}>
                                                {c.imageUrl ? <img src={c.imageUrl} alt="" className="size-full object-contain" /> : null}
                                            </Link>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {c.eyebrow ? <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c.eyebrow}</span> : null}
                                                {c.inspiration ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-medium text-primary">Inspiration</span> : null}
                                            </div>
                                            <ColumnTitle col={c} options={groupItems.filter((g) => g.id === c.id || !ids.includes(g.id))} onPick={(next) => switchColumn(c.id, next)} />
                                            <Link href={c.href} className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground">Learn more</Link>
                                        </div>
                                    ))}
                                    {empties.map((i) => {
                                        // Owner Nov 9: no single forced suggestion — a dropdown of the group's items (suggested first).
                                        const free = groupItems.filter((g) => !ids.includes(g.id));
                                        const sugIds = new Set(slotSugg.map((x) => x.id));
                                        const choices = [...free.filter((g) => sugIds.has(g.id)), ...free.filter((g) => !sugIds.has(g.id))];
                                        return (
                                            <div key={`e${i}`} className="border-r border-dashed border-border px-4 pb-5 pt-4 last:border-r-0">
                                                <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 text-center sm:h-44">
                                                    {choices.length ? (
                                                        <DropdownMenu modal={false}>
                                                            <DropdownMenuTrigger asChild>
                                                                <button type="button" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                                                                    ＋ Add a {noun} <ChevronDown className="size-4 opacity-60" aria-hidden />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="center" className="max-h-72 min-w-64 overflow-y-auto">
                                                                {choices.map((o) => (
                                                                    <DropdownMenuItem key={o.id} onSelect={() => addHere(o)}>
                                                                        <span className="flex min-w-0 items-center gap-2">
                                                                            <span className="size-8 shrink-0 overflow-hidden rounded-md bg-muted">{o.imageUrl ? <img src={o.imageUrl} alt="" className="size-full object-cover" /> : null}</span>
                                                                            <span className="line-clamp-2">{o.title}</span>
                                                                            {guided && sugIds.has(o.id) ? <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">Suggested</span> : null}
                                                                        </span>
                                                                    </DropdownMenuItem>
                                                                ))}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    ) : (
                                                        <Link href={groupHref} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                                                            ＋ Add a {noun}
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {matrixLoading && !matrix?.rows.length ? (
                                    <p className="px-4 py-6 text-sm text-muted-foreground" aria-busy="true">
                                        Loading comparison details…
                                    </p>
                                ) : null}

                                {/* Rows: label on the left (sticky when the table scrolls sideways), values across. */}
                                <div>
                                    {shownRows.map((r) => {
                                        const differs = cols.length > 1 && new Set(cols.map((c) => r.values[c.id]?.trim() ?? '')).size > 1;
                                        const def = guided ? defineRow(r.label) : undefined;
                                        return (
                                            <div key={r.key} className="grid border-b border-dashed border-border" style={tpl} data-differs={differs || undefined}>
                                                {labelCell(
                                                    <>
                                                        <span className="block text-[12px] font-semibold uppercase tracking-wide text-muted-foreground" title={guided && SHOW_VIEW_TOGGLE && eView === 'all' ? def : undefined}>
                                                            {r.label}
                                                        </span>
                                                        {guided && (!SHOW_VIEW_TOGGLE || eView === 'essentials') && def ? <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{def}</span> : null}
                                                    </>,
                                                    differs,
                                                )}
                                                {cols.map((c) => (
                                                    <div key={c.id} className={cn(cell, differs && 'bg-primary/[0.04]')}>
                                                        {r.values[c.id]?.trim() || <span className="text-muted-foreground">? Check with us</span>}
                                                    </div>
                                                ))}
                                                {empties.map((i) => <div key={`e${i}`} className={cell} />)}
                                            </div>
                                        );
                                    })}
                                </div>

                                {matrix ? (
                                    <div>
                                        <div className="grid border-b border-dashed border-border" style={tpl}>
                                            {labelCell(<span className="text-sm font-semibold">Works with</span>)}
                                            {cols.map((c) => <div key={c.id} className={cell} />)}
                                            {empties.map((i) => <div key={`e${i}`} className={cell} />)}
                                        </div>
                                        {type === 'products'
                                            ? otherCustomizations.map((o) => (
                                                  <div key={o.id} className="grid border-b border-dashed border-border" style={tpl}>
                                                      {labelCell(<WorksWithLabel title={o.title} imageUrl={o.imageUrl} />)}
                                                      {cols.map((c) => (
                                                          <div key={c.id} className={cell}>
                                                              <FitState state={c.compatIds.includes(o.id) ? 'yes' : c.compatIds.length ? 'no' : 'unknown'} />
                                                          </div>
                                                      ))}
                                                      {empties.map((i) => <div key={`e${i}`} className={cell} />)}
                                                  </div>
                                              ))
                                            : otherProducts.map((p) => (
                                                  <div key={p.slug} className="grid border-b border-dashed border-border" style={tpl}>
                                                      {labelCell(<WorksWithLabel title={p.title} imageUrl={p.imageUrl} />)}
                                                      {cols.map((c) => (
                                                          <div key={c.id} className={cell}>
                                                              <FitState state={p.available.includes(c.id) ? 'yes' : p.available.length ? 'no' : 'unknown'} />
                                                          </div>
                                                      ))}
                                                      {empties.map((i) => <div key={`e${i}`} className={cell} />)}
                                                  </div>
                                              ))}
                                        {/* Owner Nov 9: the "Options by type" / "Product lines" summary row is hidden. */}
                                        {SHOW_COMPAT_SUMMARY ? (
                                        <div className="grid border-b border-dashed border-border" style={tpl}>
                                            {labelCell(<span className="text-[13px] text-muted-foreground">{type === 'products' ? 'Options by type' : 'Product lines'}</span>)}
                                            {cols.map((c) => (
                                                <div key={c.id} className={cell}>
                                                    {c.compatSummary || <span className="text-muted-foreground">—</span>}
                                                </div>
                                            ))}
                                            {empties.map((i) => <div key={`e${i}`} className={cell} />)}
                                        </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                <div className="grid" style={tpl}>
                                    {labelCell(null)}
                                    {cols.map((c) => (
                                        <div key={c.id} className="border-r border-dashed border-border px-4 py-6 last:border-r-0">
                                            {/* Owner Nov 6: the column's two actions — request it (Add to Quote / Apply) or Bookmark it. */}
                                            <CompareActions bookmark={<CompareBookmarkButton col={c} kind={kindOf(type)} shared={shared} />}>
                                                {type === 'products' && guided ? (
                                                    <Button type="button" className="h-12 w-full text-base" onClick={() => setSheet({mode: 'choose', col: c})}>
                                                        Choose this one
                                                    </Button>
                                                ) : type === 'products' ? (
                                                    quick.enabled ? (
                                                        <Button
                                                            type="button"
                                                            className="h-12 w-full text-base"
                                                            onClick={() => {
                                                                trackCompare('compare_action', {action: 'add_to_quote', id: c.id, shared});
                                                                quick.open({slug: c.id, title: c.title});
                                                            }}
                                                        >
                                                            Add to Quote
                                                        </Button>
                                                    ) : (
                                                        <Button asChild className="h-12 w-full text-base" onClick={() => trackCompare('compare_action', {action: 'add_to_quote', id: c.id, shared})}>
                                                            <Link href={c.href}>
                                                                Add to Quote
                                                            </Link>
                                                        </Button>
                                                    )
                                                ) : quick.enabled && c.category && c.slug ? (
                                                    <Button
                                                        type="button"
                                                        className="h-12 w-full text-base"
                                                        onClick={() => {
                                                            trackCompare('compare_action', {action: 'apply', id: c.id, shared});
                                                            quick.openApply({
                                                                option: {category: c.category!, slug: c.slug!, title: c.title},
                                                                suggestions: otherProducts.map((p) => ({slug: p.slug, title: p.title, imageUrl: p.imageUrl ?? null, lineTitle: p.lineTitle})),
                                                            });
                                                        }}
                                                    >
                                                        Apply to a product
                                                    </Button>
                                                ) : (
                                                    <Button asChild className="h-12 w-full text-base" onClick={() => trackCompare('compare_action', {action: 'apply', id: c.id, shared})}>
                                                        <Link href={c.href}>Apply to a product</Link>
                                                    </Button>
                                                )}
                                            </CompareActions>
                                            {type === 'products' && withOptions(c).length ? (
                                                <Button type="button" variant="outline" className="mt-2 h-auto w-full whitespace-normal py-2.5 text-sm" onClick={() => addWith(c)}>
                                                    Add to Quote with {withLabel(c)}
                                                </Button>
                                            ) : null}
                                        </div>
                                    ))}
                                    {empties.map((i) => <div key={`e${i}`} className="border-r border-dashed border-border last:border-r-0" />)}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mx-auto mt-16 max-w-md text-center">
                        <Columns2 className="mx-auto size-8 text-muted-foreground" aria-hidden />
                        <h2 className="mt-3 text-lg font-semibold">Nothing to compare yet</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Use “Add to compare” on any product or customization. Items group themselves; open a group here to see it side by side.</p>
                        <div className="mt-5 flex justify-center gap-2">
                            <Button asChild variant="outline"><Link href="/products">Browse products</Link></Button>
                            <Button asChild variant="outline"><Link href="/customizations">Browse customizations</Link></Button>
                        </div>
                    </div>
                )}
            </PageDielineSection>
            {sheet ? (
                <CompareSheet
                    sheet={sheet}
                    others={cols.filter((c) => c.id !== sheet.col.id)}
                    options={withOptions(sheet.col)}
                    canBookmark={bookmarkAuth.canBookmark}
                    onClose={() => setSheet(null)}
                    onConfirm={(keepOthers, picks) => {
                        const c = sheet.col;
                        setSheet(null);
                        if (keepOthers) {
                            const others = cols.filter((o) => o.id !== c.id && !isBookmarked('product', o.id));
                            for (const o of others) toggleBookmark({type: 'product', id: o.id, snapshot: {title: o.title, href: o.href, ...(o.imageUrl ? {imageUrl: o.imageUrl, imageAlt: o.title} : {})}});
                            if (others.length) showToastCard({title: `Kept ${others.length} in Bookmarks`, description: 'In case you change your mind.', dismissLabel: 'Dismiss'});
                        }
                        trackCompare('compare_action', {action: sheet.mode === 'choose' ? 'choose' : 'add_with', id: c.id, kept: keepOthers, options: picks.length, shared});
                        openQuote(c, picks);
                    }}
                />
            ) : null}
        </div>
    );
}

/** Column title; when the group has other items, a dropdown to switch this column to one of them. */
function ColumnTitle({col, options, onPick}: {col: CompareColumn; options: AddInput[]; onPick: (next: AddInput) => void}) {
    if (options.filter((o) => o.id !== col.id).length === 0) return <h2 className="text-[15px] font-semibold leading-snug">{col.title}</h2>;
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <button type="button" className="flex w-full min-w-0 items-start gap-1 text-left" aria-label={`Switch ${col.title} for another`}>
                    <h2 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">{col.title}</h2>
                    <ChevronDown className="mt-0.5 size-4 shrink-0 opacity-50" aria-hidden />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 min-w-64 overflow-y-auto">
                <DropdownMenuRadioGroup
                    value={col.id}
                    onValueChange={(id) => {
                        const next = options.find((o) => o.id === id);
                        if (next && id !== col.id) onPick(next);
                    }}
                >
                    {options.map((o) => (
                        <DropdownMenuRadioItem key={o.id} value={o.id}>
                            <span className="flex min-w-0 items-center gap-2">
                                <span className="size-8 shrink-0 overflow-hidden rounded-md bg-muted">{o.imageUrl ? <img src={o.imageUrl} alt="" className="size-full object-cover" /> : null}</span>
                                <span className="line-clamp-2">{o.title}</span>
                            </span>
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** Works with row label: the option's (or box's) thumbnail, name and "in your compare" (owner Nov 9). */
function WorksWithLabel({title, imageUrl}: {title: string; imageUrl?: string | null}) {
    return (
        <span className="flex items-center gap-3">
            <span className="size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                {imageUrl ? <img src={imageUrl} alt="" className="size-full object-cover" /> : null}
            </span>
            <span className="min-w-0 text-[13px] leading-snug">
                {title}
                <span className="block text-[11px] text-muted-foreground">in your compare</span>
            </span>
        </span>
    );
}

/** CMP-5: ✓ Works · ✗ Doesn't work · ? Check with us (no data yet — never shown as a "no"). */
function FitState({state}: {state: 'yes' | 'no' | 'unknown'}) {
    if (state === 'yes')
        return (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                <Check className="size-4" aria-hidden /> Works
            </span>
        );
    if (state === 'no')
        return (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <X className="size-4" aria-hidden /> Doesn’t work
            </span>
        );
    return (
        <span className="inline-flex items-center gap-1 text-sm text-amber-700" title="No data yet — we may still be able to do it">
            <HelpCircle className="size-4" aria-hidden /> Check with us
        </span>
    );
}

type WithOption = {id: string; title: string; category: string; slug: string};

/** CMP-13 "Choose this one" and CMP-9 "Add to Quote with…" (one option per type). */
function CompareSheet({
    sheet,
    others,
    options,
    canBookmark,
    onClose,
    onConfirm,
}: {
    sheet: {mode: 'choose' | 'with'; col: CompareColumn};
    others: CompareColumn[];
    options: WithOption[];
    canBookmark: boolean;
    onClose: () => void;
    onConfirm: (keepOthers: boolean, picks: WithOption[]) => void;
}) {
    const [keep, setKeep] = useState(true);
    const byType = new Map<string, WithOption[]>();
    for (const o of options) byType.set(o.category, [...(byType.get(o.category) ?? []), o]);
    const [picked, setPicked] = useState<Record<string, string>>(() => Object.fromEntries([...byType.entries()].map(([k, list]) => [k, sheet.mode === 'with' ? list[0]!.id : ''])));
    const picks = options.filter((o) => picked[o.category] === o.id);
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-label={sheet.mode === 'choose' ? `Go with ${sheet.col.title}?` : 'Choose options'} className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div>
                    <h2 className="text-lg font-semibold">{sheet.mode === 'choose' ? `Go with ${sheet.col.title}?` : `Add ${sheet.col.title} with…`}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {sheet.mode === 'choose' ? 'Quick configure opens next, so you can set quantity and options before it goes into your quote request.' : 'One option per type. Only options that work on this box are offered.'}
                    </p>
                </div>
                {byType.size ? (
                    <div className="flex flex-col gap-3">
                        {[...byType.entries()].map(([cat, list]) => (
                            <fieldset key={cat} className="rounded-xl border border-border px-3 py-2">
                                <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{sheet.mode === 'choose' ? 'Also pick (optional)' : 'Pick one'}</legend>
                                {list.map((o) => (
                                    <label key={o.id} className="flex items-center gap-2 py-1 text-sm">
                                        <input type="radio" name={`with-${cat}`} checked={picked[cat] === o.id} onChange={() => setPicked((p) => ({...p, [cat]: o.id}))} />
                                        {o.title} <span className="text-[12px] font-medium text-emerald-700">✓ Works</span>
                                    </label>
                                ))}
                                <label className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                                    <input type="radio" name={`with-${cat}`} checked={!picked[cat]} onChange={() => setPicked((p) => ({...p, [cat]: ''}))} /> None
                                </label>
                            </fieldset>
                        ))}
                    </div>
                ) : null}
                {sheet.mode === 'choose' && others.length ? (
                    canBookmark ? (
                        <label className="flex items-start gap-2 text-sm">
                            <input type="checkbox" className="mt-0.5 size-4" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
                            <span>
                                Keep the other {others.length} in Bookmarks, in case you change your mind
                                <span className="block text-[12px] text-muted-foreground">{others.map((o) => o.title).join(' · ')}</span>
                            </span>
                        </label>
                    ) : (
                        <p className="text-[12.5px] text-muted-foreground">Sign in to keep the others in Bookmarks.</p>
                    )
                ) : null}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={() => onConfirm(sheet.mode === 'choose' && canBookmark && keep, picks)}>
                        Add to Quote
                    </Button>
                </div>
            </div>
        </div>
    );
}

/** Main action (full width) with the bookmark icon button on its right, like the Product DP. Owner Nov 6: larger CTAs (h-12, text-base). */
function CompareActions({children, bookmark}: {children: ReactNode; bookmark: ReactNode}) {
    return (
        <div className="flex items-stretch gap-2">
            <div className="min-w-0 flex-1">{children}</div>
            {bookmark}
        </div>
    );
}

/** Bookmark a compared item (R26). Signed out: the usual "Sign in to bookmark" toast. */
function CompareBookmarkButton({col, kind, shared}: {col: CompareColumn; kind: CompareKind; shared: boolean}) {
    const pathname = usePathname() || '/compare';
    const {canBookmark, loginHref} = useBookmarkAuth();
    const {isBookmarked} = useBookmarks();
    const on = isBookmarked(kind, col.id);
    return (
        <Button
            type="button"
            variant="outline"
            className="h-12 w-12 shrink-0 px-0 shadow-none"
            aria-pressed={on}
            aria-label={on ? 'Bookmarked' : 'Bookmark'}
            title={on ? 'Bookmarked' : 'Bookmark'}
            onClick={(event) => {
                trackCompare('compare_action', {action: 'bookmark', id: col.id, shared});
                runBookmarkToggle(
                    event,
                    {
                        type: kind,
                        id: col.id,
                        snapshot: {
                            title: col.title,
                            href: col.href,
                            ...(col.imageUrl ? {imageUrl: col.imageUrl, imageAlt: col.title} : {}),
                            ...(kind === 'customization' && col.category ? {categoryValue: col.category} : {}),
                        },
                    },
                    {allowed: canBookmark, loginHref: loginHref(pathname)},
                );
            }}
        >
            <Bookmark className={cn('size-5', on && 'fill-current')} aria-hidden />
        </Button>
    );
}
