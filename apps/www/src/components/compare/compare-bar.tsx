'use client';

/**
 * Compare bar (vault prd-website-compare.md §4.1, CMP-1–CMP-7, CMP-12): the site-wide compare
 * tool. The round compare button sits bottom-right; open, the bar slides up full width with its
 * own Close and the round button fades out.
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
import {useEffect, useMemo, useRef, useState} from 'react';
import {Columns2, Plus, X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {pageDielineContentClass, pageDielineOuterClass} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    addToCompare,
    clearCompare,
    compareGroups,
    compareHref,
    dismissCompareSnack,
    rememberCompareReturn,
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

type ProductFit = {slug: string; title: string; available: string[]};
type Fit = 'yes' | 'no' | 'unknown';
/** How a thumbnail relates to the one being hovered. */
type Relation = 'match' | 'unknown' | 'dim' | null;

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

    const barRef = useRef<HTMLDivElement>(null);
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

    // Remember the last page outside /compare, so Close on /compare returns there (owner Nov 9).
    useEffect(() => {
        if (!pathname.startsWith('/compare')) rememberCompareReturn(window.location.pathname + window.location.search);
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
    const [suggest, setSuggest] = useState<Record<string, AddInput[]>>({});
    useEffect(() => {
        if (!guided || !open || !singles.length) return;
        let off = false;
        const exclude = items.map((i) => i.id).join(',');
        Promise.all(
            singles.map((it) =>
                fetch(`/api/compare/suggest?kind=${it.kind}&id=${encodeURIComponent(it.id)}&exclude=${encodeURIComponent(exclude)}`)
                    .then((r) => (r.ok ? r.json() : {items: []}))
                    .then((j: {items: AddInput[]}) => [groupId(it.kind, it.groupKey), j.items ?? []] as const)
                    .catch(() => [groupId(it.kind, it.groupKey), [] as AddInput[]] as const),
            ),
        ).then((pairs) => !off && setSuggest(Object.fromEntries(pairs)));
        return () => {
            off = true;
        };
    }, [guided, open, singlesKey]);

    // Fly-in: from the add button to the round button (bottom-left).
    const [fly, setFly] = useState<{x: number; y: number; src?: string | null; go: boolean; at: number} | null>(null);
    useEffect(() => {
        const f = dock.flyFrom;
        if (!f || hidden) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        setFly({x: f.x, y: f.y, src: f.imageUrl, go: false, at: f.at});
        const t1 = requestAnimationFrame(() => setFly((p) => (p && p.at === f.at ? {...p, go: true} : p)));
        const t2 = setTimeout(() => setFly((p) => (p && p.at === f.at ? null : p)), 650);
        return () => {
            cancelAnimationFrame(t1);
            clearTimeout(t2);
        };
    }, [dock.flyFrom, hidden]);

    if (hidden || !hasItems) return null;

    const snackGroup = dock.snack?.compareGroup ? groups.find((g) => groupId(g.kind, g.key) === dock.snack!.compareGroup) : undefined;
    const lane = (g: CompareGroup) => {
        const key = groupId(g.kind, g.key);
        const n = g.items.length;
        const pending = dock.pending && groupId(dock.pending.kind, dock.pending.groupKey) === key ? dock.pending : null;
        const sugg = guided && n === 1 ? suggest[key] ?? [] : [];
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
                <div className="col-span-2 row-start-2 flex gap-2.5 overflow-x-auto pb-1 pt-1.5 sm:col-span-1 sm:row-start-auto">
                    {g.items.map((it) => (
                        <Thumb key={it.id} item={it} relation={relationOf(it)} onHover={onHoverFor(it)} onRemove={() => removeFromCompare(it.kind, it.id)} />
                    ))}
                </div>
                <div className="col-start-2 row-start-1 flex justify-end sm:col-start-3">
                    {n >= 2 ? (
                        <Button asChild size="sm">
                            <Link href={compareHref(g)}>
                                Compare ({n})
                            </Link>
                        </Button>
                    ) : sugg.length ? (
                        <div className="flex flex-wrap items-center justify-end gap-1.5 text-[12px] text-muted-foreground">
                            <span>Also compare:</span>
                            {sugg.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={(e) => {
                                        const r = e.currentTarget.getBoundingClientRect();
                                        addToCompare(s, {x: r.left + r.width / 2, y: r.top + r.height / 2});
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary px-2.5 py-1 font-medium text-primary hover:bg-primary/5"
                                >
                                    <Plus className="size-3" aria-hidden /> {s.styleTitle ?? s.title}
                                </button>
                            ))}
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
            {fly ? (
                <span
                    aria-hidden
                    className="pointer-events-none fixed z-[80] size-12 overflow-hidden rounded-lg border border-border bg-muted shadow-lg transition-all duration-500 ease-in-out"
                    style={
                        fly.go
                            ? {left: 'auto', right: 20, top: 'calc(100vh - 1.25rem - 3rem)', transform: 'scale(0.5)', opacity: 0.4}
                            : {left: fly.x - 24, top: fly.y - 24, transform: 'scale(1)', opacity: 1}
                    }
                >
                    {fly.src ? <img src={fly.src} alt="" className="size-full object-cover" /> : null}
                </span>
            ) : null}

            {hover && open && fits.length ? <FitTip at={hover.at} {...tipFor(hover.item)} /> : null}

            {dock.snack && !open ? (
                <div
                    role="status"
                    className="fixed left-1/2 z-[70] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 rounded-xl bg-foreground py-2 pl-4 pr-2 text-sm text-background shadow-xl"
                    style={{bottom: 'calc(1.25rem + 4rem)'}}
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
                                {/* -mr-2: the icon's edge lines up with the Compare (n) buttons below. */}
                                <Button type="button" variant="ghost" size="icon" className="-mr-2 size-8" onClick={() => setDockOpen(false)} aria-label="Close compare">
                                    <X className="size-4" aria-hidden />
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
                style={{bottom: '1.25rem'}}
                aria-hidden={open || undefined}
            >
                <button
                    type="button"
                    onClick={() => setDockOpen(true)}
                    aria-label={`Open compare, ${items.length} ${items.length === 1 ? 'item' : 'items'}`}
                    title="Compare"
                    aria-expanded={open}
                    tabIndex={open ? -1 : 0}
                    className="relative flex size-12 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg hover:bg-muted"
                >
                    <Columns2 className="size-5" aria-hidden />
                    <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[11px] font-semibold tabular-nums text-background">{items.length}</span>
                </button>
            </div>
        </>
    );
}
