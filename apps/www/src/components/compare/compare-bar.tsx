'use client';

/**
 * Compare bar (vault prd-website-compare.md §4.1, CMP-1–CMP-7, CMP-12): the site-wide compare
 * tool. The round compare button sits
 * bottom-right, under the chat button — when it appears it takes chat's place and chat moves up.
 * Open: the bar slides up full width with its own Close; the compare button fades out and chat lifts above the bar.
 * - Adding confirms with a snackbar ("Added to Rigid boxes (2) · Compare · Undo"); the bar opens
 *   from the round button (and once on the first add of a session).
 * - Slim bar: one row per group, every group visible, Compare (n) per row.
 * - Fit (owner Nov 9): no badges. Hover or focus any thumbnail: a tooltip says what it works with,
 *   and the matching items in the other groups light up.
 * - Guided: a group of one suggests what to compare next ("Also compare").
 * Hidden on /request/* and /compare. `guided` comes in as a prop (production: Guided).
 */
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {getCompareBehavior} from '@/lib/compare/compare-behavior';
import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Columns2, Plus, X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {pageDielineContentClass, pageDielineOuterClass} from '@pakfactory/ui/components/page-dieline-section';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {SneakPeek} from '@pakfactory/ui/components/sneak-peek';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    addToCompare,
    clearCompare,
    clearCompareGroup,
    compareGroups,
    compareHref,
    dismissCompareSnack,
    groupId,
    removeFromCompare,
    resolvePending,
    setDockOpen,
    undoCompare,
    useCompareSet,
    type AddInput,
    type CompareGroup,
    type CompareItem,
} from '@/lib/compare/compare-set';
import {isToolShellPath, rememberToolShellReturn} from '@/lib/ui/tool-shell-return';

/** Suggest payload may include a peek blurb that is not stored on the compare set. */
type SuggestItem = AddInput & {shortDescription?: string};

type ProductFit = {slug: string; title: string; available: string[]};
type Fit = 'yes' | 'no' | 'unknown';
/** How a thumbnail relates to the one being hovered. */
type Relation = 'match' | 'unknown' | 'dim' | null;

/** Chat moves up by the round button (size-12) + an 8px gap; it reads these from chat-fab.tsx. */
const FAB_STACK = 'calc(3rem + 8px)';
function setRootVar(name: string, value: string | null) {
    if (typeof document === 'undefined') return;
    if (value == null) document.documentElement.style.removeProperty(name);
    else document.documentElement.style.setProperty(name, value);
}
const SNACK_MS = 4500;

function Thumb({
    item,
    onRemove,
    relation,
    onHover,
}: {
    item: CompareItem;
    onRemove?: () => void;
    relation?: Relation;
    /** Element on enter/focus, null on leave/blur. */
    onHover?: (el: HTMLElement | null) => void;
}) {
    return (
        <span
            className={cn(
                'group/thumb relative block size-11 shrink-0 rounded-lg border border-border bg-muted outline-none transition-[opacity,box-shadow] duration-150',
                relation === 'match' && 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background',
                relation === 'unknown' && 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background',
                relation === 'dim' && 'opacity-35',
                'focus-visible:ring-2 focus-visible:ring-foreground',
            )}
            tabIndex={onHover ? 0 : undefined}
            onMouseEnter={(e) => onHover?.(e.currentTarget)}
            onMouseLeave={() => onHover?.(null)}
            onFocus={(e) => onHover?.(e.currentTarget)}
            onBlur={() => onHover?.(null)}
            aria-label={item.title}
        >
            <span className="block size-full overflow-hidden rounded-lg">
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="size-full object-cover" />
                ) : (
                    <span className="flex size-full items-center justify-center px-1 text-center text-[9px] leading-tight text-muted-foreground">{item.title}</span>
                )}
            </span>
            {onRemove ? (
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={`Remove ${item.title} from compare`}
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-background text-foreground opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-hover/thumb:opacity-100 [@media(hover:none)]:opacity-100"
                >
                    <X className="size-3" aria-hidden />
                </button>
            ) : null}
        </span>
    );
}

/** Hover tooltip: what the hovered item works with among the other kind in the set. */
function FitTip({at, title, groups}: {at: DOMRect; title: string; groups: {label: string; tone: 'ok' | 'check' | 'no'; names: string[]}[]}) {
    return (
        <div
            role="tooltip"
            className="pointer-events-none fixed z-[75] w-max max-w-[18rem] -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-3 py-2 text-[12px] leading-snug text-background shadow-xl"
            style={{left: at.left + at.width / 2, top: at.top - 10}}
        >
            <p className="font-semibold">{title}</p>
            {groups.map((g) =>
                g.names.length ? (
                    <p key={g.label} className="mt-1">
                        <span className={cn('font-semibold', g.tone === 'ok' ? 'text-emerald-300' : g.tone === 'check' ? 'text-amber-300' : 'text-background/60')}>
                            {g.tone === 'ok' ? '✓' : g.tone === 'check' ? '?' : '✗'} {g.label}:
                        </span>{' '}
                        {g.names.join(', ')}
                    </p>
                ) : null,
            )}
        </div>
    );
}

export function CompareBar({guided}: {guided: boolean}) {
    const pathname = usePathname() || '';
    const {items, dock} = useCompareSet();
    const hidden = pathname.startsWith('/request') || pathname.startsWith('/compare');
    const hasItems = items.length > 0;
    const open = dock.open && !hidden && hasItems;
    const groups = useMemo(() => compareGroups(items), [items]);

    // Impulse grow on the FAB when the set count goes up (add feedback; no fly-in).
    const prevCountRef = useRef(items.length);
    const [fabPop, setFabPop] = useState(false);
    useEffect(() => {
        const prev = prevCountRef.current;
        prevCountRef.current = items.length;
        if (items.length <= prev) return;
        setFabPop(false);
        const id = requestAnimationFrame(() => setFabPop(true));
        return () => cancelAnimationFrame(id);
    }, [items.length]);

    // Chat sits on top of the round compare button while it shows; the open bar (full width)
    // lifts both buttons above it.
    const barRef = useRef<HTMLDivElement>(null);
    const showButton = !hidden && hasItems && !open;
    useEffect(() => {
        setRootVar('--compare-fab-stack', showButton ? FAB_STACK : '0px');
    }, [showButton]);
    // Slide: mount, then move in on the next frame; on close move out, then unmount.
    const [mounted, setMounted] = useState(false);
    const [shown, setShown] = useState(false);
    useEffect(() => {
        if (open) {
            setMounted(true);
            const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
            return () => cancelAnimationFrame(id);
        }
        setShown(false);
        const t = setTimeout(() => setMounted(false), 320);
        return () => clearTimeout(t);
    }, [open]);
    // Escape collapses the dock (same as Done); does not clear items. No outside-click dismiss.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            setDockOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);
    useLayoutEffect(() => {
        const el = barRef.current;
        setRootVar('--compare-drawer-lift', shown && el ? `${Math.round(el.getBoundingClientRect().height + 8)}px` : '0px');
    }, [shown, items.length, dock.pending]);
    useEffect(
        () => () => {
            setRootVar('--compare-fab-stack', null);
            setRootVar('--compare-drawer-lift', null);
        },
        [],
    );

    // Remember the last site page (not /request or /compare) so tool-shell Close returns there.
    useEffect(() => {
        if (!isToolShellPath(pathname)) {
            rememberToolShellReturn(window.location.pathname + window.location.search);
        }
    }, [pathname]);

    // Page change closes the bar back to the round button.
    const lastPath = useRef(pathname);
    useEffect(() => {
        if (lastPath.current === pathname) return;
        lastPath.current = pathname;
        setDockOpen(false);
        dismissCompareSnack();
    }, [pathname]);

    // Snackbar times out (one at a time; a new one restarts the clock).
    useEffect(() => {
        if (!dock.snack) return;
        const t = setTimeout(() => dismissCompareSnack(), SNACK_MS);
        return () => clearTimeout(t);
    }, [dock.snack]);

    // CMP-4: fit badge — which customizations the boxes in the set take (only when both kinds are in).
    const productIds = items.filter((i) => i.kind === 'product').map((i) => i.id).join(',');
    const hasCustomizations = items.some((i) => i.kind === 'customization');
    const [fits, setFits] = useState<ProductFit[]>([]);
    useEffect(() => {
        if (!open || !productIds || !hasCustomizations) return setFits([]);
        let off = false;
        fetch(`/api/compare/products?ids=${encodeURIComponent(productIds)}`)
            .then((r) => (r.ok ? r.json() : {products: []}))
            .then((j: {products: ProductFit[]}) => !off && setFits(j.products ?? []))
            .catch(() => !off && setFits([]));
        return () => {
            off = true;
        };
    }, [open, productIds, hasCustomizations]);
    /** Does option `cid` work on product `slug`? A product with no list = no data yet (unknown, never "no"). */
    const fitOf = (cid: string, slug: string): Fit | null => {
        const p = fits.find((f) => f.slug === slug);
        if (!p) return null;
        return p.available.includes(cid) ? 'yes' : p.available.length ? 'no' : 'unknown';
    };
    // Owner Nov 9: hover (or focus) a thumbnail — the other kind's matches light up, the rest dim, and a tooltip lists them.
    const [hover, setHover] = useState<{item: CompareItem; at: DOMRect} | null>(null);
    useEffect(() => setHover(null), [items.length, open]);
    const fitBetween = (a: CompareItem, b: CompareItem): Fit | null =>
        a.kind === 'customization' && b.kind === 'product' ? fitOf(a.id, b.id) : a.kind === 'product' && b.kind === 'customization' ? fitOf(b.id, a.id) : null;
    const relationOf = (it: CompareItem): Relation => {
        if (!hover || !fits.length || it.id === hover.item.id) return null;
        if (it.kind === hover.item.kind) return 'dim';
        const f = fitBetween(hover.item, it);
        return f === 'yes' ? 'match' : f === 'unknown' ? 'unknown' : 'dim';
    };
    const tipFor = (h: CompareItem) => {
        const others = items.filter((i) => i.kind !== h.kind);
        const by = (want: Fit) => others.filter((o) => fitBetween(h, o) === want).map((o) => o.title);
        const isC = h.kind === 'customization';
        return {
            title: h.title,
            groups: [
                {label: isC ? 'Works with' : 'Takes', tone: 'ok' as const, names: by('yes')},
                {label: 'Check with us', tone: 'check' as const, names: by('unknown')},
                {label: isC ? 'Doesn’t work with' : 'Doesn’t take', tone: 'no' as const, names: by('no')},
            ],
        };
    };
    const onHoverFor = (it: CompareItem) =>
        fits.length ? (el: HTMLElement | null) => setHover(el ? {item: it, at: el.getBoundingClientRect()} : null) : undefined;

    // CMP-12 (Guided): "Also compare" for each group of one.
    const singles = groups.filter((g) => g.items.length === 1).map((g) => g.items[0]!);
    const singlesKey = singles.map((i) => `${i.kind}:${i.id}`).join('|');
    const [suggest, setSuggest] = useState<Record<string, SuggestItem[]>>({});
    const [suggestLoading, setSuggestLoading] = useState<Record<string, boolean>>({});
    useEffect(() => {
        if (!guided || !open || !singles.length) {
            setSuggestLoading({});
            return;
        }
        let off = false;
        const keys = singles.map((it) => groupId(it.kind, it.groupKey));
        setSuggestLoading(Object.fromEntries(keys.map((k) => [k, true])));
        const exclude = items.map((i) => i.id).join(',');
        Promise.all(
            singles.map((it) =>
                fetch(`/api/compare/suggest?kind=${it.kind}&id=${encodeURIComponent(it.id)}&exclude=${encodeURIComponent(exclude)}`)
                    .then((r) => (r.ok ? r.json() : {items: []}))
                    .then((j: {items: SuggestItem[]}) => [groupId(it.kind, it.groupKey), j.items ?? []] as const)
                    .catch(() => [groupId(it.kind, it.groupKey), [] as SuggestItem[]] as const),
            ),
        ).then((pairs) => {
            if (off) return;
            setSuggest(Object.fromEntries(pairs));
            setSuggestLoading(Object.fromEntries(pairs.map(([k]) => [k, false])));
        });
        return () => {
            off = true;
        };
    }, [guided, open, singlesKey]);

    if (hidden || !hasItems) return null;

    const snackGroup = dock.snack?.compareGroup ? groups.find((g) => groupId(g.kind, g.key) === dock.snack!.compareGroup) : undefined;
    const lane = (g: CompareGroup) => {
        const key = groupId(g.kind, g.key);
        const n = g.items.length;
        const pending = dock.pending && groupId(dock.pending.kind, dock.pending.groupKey) === key ? dock.pending : null;
        const sugg = guided && n === 1 ? suggest[key] ?? [] : [];
        const loadingSugg = guided && n === 1 && Boolean(suggestLoading[key]) && sugg.length === 0;
        const isC = g.kind === 'customization';
        return (
            <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-t border-dashed border-border py-3 first:border-t-0 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
                <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{g.label}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                        {/* Owner Nov 9: no fit legend here — the badge tooltip explains it. */}
                        {isC ? 'Customization' : 'Product line'} · {n}/{getCompareBehavior().maxPerGroup}
                    </p>
                </div>
                <div className="col-span-2 row-start-2 flex items-center gap-2.5 overflow-x-auto pb-1 pt-1.5 sm:col-span-1 sm:row-start-auto">
                    {g.items.map((it) => (
                        <Thumb key={it.id} item={it} relation={relationOf(it)} onHover={onHoverFor(it)} onRemove={() => removeFromCompare(it.kind, it.id)} />
                    ))}
                    <button
                        type="button"
                        onClick={() => clearCompareGroup(g.kind, g.key)}
                        className="shrink-0 self-center text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        aria-label={`Clear ${g.label}`}
                    >
                        Clear
                    </button>
                </div>
                <div className="col-start-2 row-start-1 flex justify-end sm:col-start-3">
                    {n >= 2 ? (
                        <Button asChild size="sm">
                            <Link href={compareHref(g)}>
                                Compare ({n})
                            </Link>
                        </Button>
                    ) : loadingSugg ? (
                        <div
                            className="flex flex-wrap items-center justify-end gap-1.5"
                            aria-busy="true"
                            aria-live="polite"
                        >
                            <span className="sr-only">Loading suggestions</span>
                            <Skeleton className="h-7 w-28 rounded-full" />
                            <Skeleton className="h-7 w-32 rounded-full" />
                        </div>
                    ) : sugg.length ? (
                        <div className="flex flex-wrap items-center justify-end gap-1.5 text-[12px] text-muted-foreground">
                            <span>Also compare:</span>
                            {sugg.map((s) => {
                                const {shortDescription, ...addInput} = s;
                                const label = s.styleTitle ?? s.title;
                                return (
                                    <SneakPeek
                                        key={s.id}
                                        title={label}
                                        excerpt={shortDescription}
                                        imageUrl={s.imageUrl}
                                        side="top"
                                        contentClassName="z-[70]"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => addToCompare(addInput)}
                                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary px-2.5 py-1 font-medium text-primary hover:bg-primary/5"
                                        >
                                            <Plus className="size-3" aria-hidden /> {label}
                                        </button>
                                    </SneakPeek>
                                );
                            })}
                        </div>
                    ) : (
                        <span className="text-[12px] text-muted-foreground">Add another to compare</span>
                    )}
                </div>
                {pending ? (
                    <div className="col-span-full flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-[13px]" role="alert">
                        <span>
                            <span className="font-semibold">{g.label} holds {getCompareBehavior().maxPerGroup}.</span> Replace which with {pending.title}?
                        </span>
                        {g.items.map((it) => (
                            <Button key={it.id} type="button" variant="outline" size="sm" onClick={() => resolvePending(it.id)}>
                                {it.styleTitle ?? it.title}
                            </Button>
                        ))}
                        <Button type="button" variant="ghost" size="sm" onClick={() => resolvePending(null)}>
                            Cancel
                        </Button>
                    </div>
                ) : null}
            </div>
        );
    };
    const ordered = [...groups.filter((g) => g.kind === 'product'), ...groups.filter((g) => g.kind === 'customization')];

    return (
        <>
            {hover && open && fits.length ? <FitTip at={hover.at} {...tipFor(hover.item)} /> : null}

            {dock.snack && !open ? (
                <div
                    role="status"
                    className="fixed left-1/2 z-[70] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 rounded-xl bg-foreground py-2 pl-4 pr-2 text-sm text-background shadow-xl"
                    style={{bottom: 'calc(var(--chat-fab-offset, 1.25rem) + 4rem)'}}
                >
                    <span className="pr-2">{dock.snack.text}</span>
                    {snackGroup && snackGroup.items.length >= 2 ? (
                        <Link href={compareHref(snackGroup)} className="rounded-md px-2 py-1 font-semibold underline underline-offset-4 hover:bg-background/10">
                            Compare
                        </Link>
                    ) : null}
                    {dock.undo ? (
                        <button type="button" onClick={undoCompare} className="rounded-md px-2 py-1 font-semibold underline underline-offset-4 hover:bg-background/10">
                            Undo
                        </button>
                    ) : null}
                </div>
            ) : null}

            {mounted ? (
                <div
                    ref={barRef}
                    role="region"
                    aria-label="Compare"
                    className={cn(
                        'fixed inset-x-0 bottom-0 z-[55] flex max-h-[60vh] flex-col rounded-t-2xl border border-b-0 border-border bg-background shadow-[0_-12px_40px_rgba(0,0,0,0.12)] sm:max-h-[50vh]',
                        'transition-transform duration-300 ease-out motion-reduce:transition-none',
                        shown ? 'translate-y-0' : 'translate-y-full',
                    )}
                >
                    {/* Owner Nov 9: same max width and gutters as the page's dieline sections; a quiet toolbar
                        (small type, muted Clear all) over a dashed rule, so the groups lead. */}
                    <div className={pageDielineOuterClass('border-b border-dashed border-border')}>
                        <div className={pageDielineContentClass('flex items-center justify-between gap-3 py-2')}>
                            <p className="text-[13px] font-semibold">Compare</p>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={clearCompare} className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                                    Clear all
                                </button>
                                <Button type="button" size="sm" onClick={() => setDockOpen(false)}>
                                    Done
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className={pageDielineOuterClass('overflow-y-auto')}>
                        <div className={pageDielineContentClass('pb-3 pt-1')}>{ordered.map(lane)}</div>
                    </div>
                </div>
            ) : null}

            {/* Owner Nov 9: the round button fades out while the bar is open (the bar has its own Close). */}
            <div
                className={cn(
                    'fixed right-5 z-[60] transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
                    open ? 'pointer-events-none translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
                )}
                style={{bottom: 'var(--chat-fab-offset, 1.25rem)'}}
                aria-hidden={open || undefined}
            >
                <button
                    type="button"
                    onClick={() => setDockOpen(true)}
                    aria-label={`Open compare, ${items.length} ${items.length === 1 ? 'item' : 'items'}`}
                    title="Compare"
                    aria-expanded={open}
                    tabIndex={open ? -1 : 0}
                    onAnimationEnd={() => setFabPop(false)}
                    className={cn(
                        'relative flex size-12 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg hover:bg-muted',
                        fabPop && 'animate-compare-fab-pop motion-reduce:animate-none',
                    )}
                >
                    <Columns2 className="size-5" aria-hidden />
                    <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[11px] font-semibold tabular-nums text-background">{items.length}</span>
                </button>
            </div>
        </>
    );
}
