'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';
import {cn} from '@pakfactory/ui/lib/utils';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {applyCompatibilityQuery} from '@/components/product/compatibility-preselect';
import {useQuotePoolDrawer} from '@/components/request/quote-pool-drawer';
import {showToastCard} from '@/components/ui/toast-card';
import {useBookmarks} from '@/lib/bookmarks/bookmarks';
import {useBookmarkAuth} from '@/lib/bookmarks/use-bookmark-auth';
import {compatibilityProductHref} from '@/lib/catalog/compatibility-product-href';
import {serializeCompatibilityQuery, type CompatibilityPropertySelection} from '@/lib/catalog/compatibility-query';
import {REQUEST_COPY} from '@/lib/copy/request';
import {
    buildStepsFromCatalog,
    createEmptyBuilderState,
    resolvePrintableSides,
    toRequestCustomizations,
} from '@/lib/customization-builder';
import {useRequest} from '@/lib/request/request-provider';
import type {RequestLine} from '@/lib/request/request.storage';
import {customizationCompatibilityHref} from '@/lib/www-routes';
import {checkApplyTargets, loadQuickProduct, type ApplyCheck} from '@/lib/catalog/load-quick-product';
import {useLockPageScroll, type QuickTarget} from '@/components/quick-configure/quick-configure';

/**
 * F25 Apply popup (Product & Customization PRD v0.2).
 * "Apply to a product" shows the buyer's own items first: the open request,
 * other drafts, bookmarks (signed in), then other compatible products. Items
 * that can't take the customization stay visible, greyed, with the reason.
 * A request item is updated in place (undo · add as a new line); anything
 * else opens Quick configure (F24).
 */
export type ApplyRequest = {
    option: {category: string; slug: string; title: string; achievedBySlug?: string};
    /** Property picks carried from the customization page (PROD-3174). */
    properties?: CompatibilityPropertySelection[];
    /** Other compatible products (the first 6 not already listed are shown). */
    suggestions?: {slug: string; title: string; imageUrl?: string | null; lineTitle?: string}[];
    /** Unused: "See all compatible products" always opens the compatibility page for this option (owner, Oct 28). */
    seeAllHref?: string;
};

type Row = {key: string; slug: string; title: string; sub?: string; imageUrl?: string | null};

export function ApplyPopup({
    request,
    onClose,
    openQuick,
}: {
    request: ApplyRequest;
    onClose: () => void;
    openQuick: (t: QuickTarget) => void;
}) {
    const {option, properties = [], suggestions = []} = request;
    // "See all compatible products" → /customizations/compatibility with this option (and carried picks).
    const seeAllHref = customizationCompatibilityHref(
        serializeCompatibilityQuery({selections: [{category: option.category, optionSlug: option.slug}], properties}),
    );
    const {lines, savedDrafts, activeDraftId, tabs, switchTo, updateLine} = useRequest();
    const {openQuotePoolDrawer} = useQuotePoolDrawer();
    const {canBookmark} = useBookmarkAuth();
    const {bookmarks} = useBookmarks();
    const [checks, setChecks] = useState<Record<string, ApplyCheck>>({});
    const [busy, setBusy] = useState<string | null>(null);
    const [pending, setPending] = useState<{draftId: string; line: RequestLine} | null>(null);
    useLockPageScroll();

    const queryFor = (slug: string) =>
        compatibilityProductHref(slug, {category: option.category, slug: option.slug, ...(option.achievedBySlug ? {achievedBySlug: option.achievedBySlug} : {})}, properties).split('?')[1] ?? '';

    const openName = tabs.find((t) => t.id === activeDraftId)?.name ?? REQUEST_COPY.newRequestTab;
    const otherDrafts = savedDrafts.filter((d) => d.id !== activeDraftId && d.lines.length);
    const bookmarkRows: Row[] = canBookmark
        ? bookmarks
              .filter((b) => b.type === 'product')
              .map((b) => ({key: `bm:${b.id}`, slug: b.id, title: b.snapshot.title, sub: b.snapshot.productLineTitle, imageUrl: b.snapshot.imageUrl}))
        : [];
    const listed = new Set([...lines.map((l) => l.productSlug), ...otherDrafts.flatMap((d) => d.lines.map((l) => l.productSlug)), ...bookmarkRows.map((r) => r.slug)]);
    const others: Row[] = suggestions
        .filter((s) => !listed.has(s.slug))
        .slice(0, 6)
        .map((s) => ({key: `s:${s.slug}`, slug: s.slug, title: s.title, sub: s.lineTitle, imageUrl: s.imageUrl}));

    const toCheck = useMemo(
        () => [...listed].sort(),
        [[...listed].sort().join('|')],
    );
    useEffect(() => {
        let live = true;
        if (!toCheck.length) return;
        checkApplyTargets(toCheck, {category: option.category, slug: option.slug})
            .then((res) => {
                if (live) setChecks(Object.fromEntries(res.map((r) => [r.slug, r])));
            })
            .catch(() => undefined);
        return () => {
            live = false;
        };
    }, [toCheck, option.category, option.slug]);

    async function applyToLine(line: RequestLine) {
        setBusy(line.id);
        const data = await loadQuickProduct(line.productSlug).catch(() => null);
        setBusy(null);
        const title = line.productTitle ?? line.productSlug;
        if (!data) {
            showToastCard({title: `Couldn’t apply ${option.title}`, description: 'The product couldn’t be loaded.', dismissLabel: REQUEST_COPY.close});
            return;
        }
        const {product} = data;
        const result = applyCompatibilityQuery(product, line.customizationBuilder ?? createEmptyBuilderState(), new URLSearchParams(queryFor(product.slug)));
        if (!result) {
            showToastCard({title: `Couldn’t apply ${option.title}`, description: `Not available on ${title}.`, dismissLabel: REQUEST_COPY.close});
            return;
        }
        const customizations = toRequestCustomizations(
            result.state,
            CUSTOMIZATION_BUILDER_COPY.specialistToAdvise,
            buildStepsFromCatalog(product.availableCustomizations),
            resolvePrintableSides(product.properties),
        );
        updateLine(line.id, {customizationBuilder: result.state, customizations});
        onClose();
        openQuotePoolDrawer();
    }

    // An item in another draft: open that request first, then apply once its lines are loaded.
    useEffect(() => {
        if (!pending || activeDraftId !== pending.draftId) return;
        const line = lines.find((l) => l.id === pending.line.id);
        if (!line) return;
        setPending(null);
        void applyToLine(line);
    }, [pending, activeDraftId, lines]);

    const configure = (slug: string, title: string) => {
        onClose();
        openQuick({slug, query: queryFor(slug), title});
    };

    const lineRow = (line: RequestLine, onApply: () => void) => {
        const c = checks[line.productSlug];
        const ok = c ? c.ok : undefined;
        return (
            <ItemRow
                key={line.id}
                row={{key: line.id, slug: line.productSlug, title: line.productTitle ?? line.productSlug, sub: line.productLineTitle, imageUrl: line.productMedia?.[0]?.src}}
                ok={ok}
                reason={c?.reason}
                busy={busy === line.id}
                primary={{label: 'Apply', onClick: onApply}}
                secondary={{label: 'Add as a new line', onClick: () => configure(line.productSlug, line.productTitle ?? line.productSlug)}}
            />
        );
    };

    const empty = !lines.length && !otherDrafts.length && !bookmarkRows.length && !others.length;

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Apply {option.title} to…</DialogTitle>
                    <DialogDescription>Pick one of your items, or a compatible product.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-5">
                    {lines.length ? (
                        <Section title={`Quote Request · ${openName}`}>
                            {lines.map((line) => lineRow(line, () => void applyToLine(line)))}
                        </Section>
                    ) : null}
                    {otherDrafts.map((d) => (
                        <Section key={d.id} title={tabs.find((t) => t.id === d.id)?.name ?? 'Saved request'}>
                            {d.lines.map((line) =>
                                lineRow(line, () => {
                                    setPending({draftId: d.id, line});
                                    switchTo(d.id);
                                }),
                            )}
                        </Section>
                    ))}
                    {bookmarkRows.length ? (
                        <Section title="Bookmarks">
                            {bookmarkRows.map((r) => {
                                const c = checks[r.slug];
                                return (
                                    <ItemRow key={r.key} row={r} ok={c ? c.ok : undefined} reason={c?.reason}
                                        primary={{label: 'Configure', onClick: () => configure(r.slug, r.title)}} />
                                );
                            })}
                        </Section>
                    ) : null}
                    {others.length ? (
                        <Section title="Other compatible products">
                            {others.map((r) => (
                                <ItemRow key={r.key} row={r} ok primary={{label: 'Configure', onClick: () => configure(r.slug, r.title)}} />
                            ))}
                        </Section>
                    ) : null}
                    {empty ? <p className="text-sm text-muted-foreground">Nothing in your request or bookmarks yet.</p> : null}
                    <Link href={seeAllHref} onClick={onClose} className="text-center text-sm font-medium underline underline-offset-4">
                        See all compatible products
                    </Link>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
    return (
        <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
            <ul className="flex flex-col gap-2">{children}</ul>
        </section>
    );
}

function ItemRow({
    row,
    ok,
    reason,
    busy = false,
    primary,
    secondary,
}: {
    row: Row;
    /** undefined = still checking. */
    ok: boolean | undefined;
    reason?: string;
    busy?: boolean;
    primary: {label: string; onClick: () => void};
    secondary?: {label: string; onClick: () => void};
}) {
    const blocked = ok === false;
    return (
        <li className={cn('flex items-center gap-3 rounded-lg border border-border p-2', blocked && 'opacity-60')}>
            <span className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                {row.imageUrl ? <img src={row.imageUrl} alt="" className="size-full object-cover" /> : null}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{row.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                    {blocked ? reason ?? 'Not available on this product' : ok === undefined ? 'Checking…' : row.sub}
                </span>
                {secondary && !blocked ? (
                    <button type="button" onClick={secondary.onClick} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
                        {secondary.label}
                    </button>
                ) : null}
            </span>
            <Button type="button" size="sm" disabled={blocked || ok === undefined || busy} onClick={primary.onClick}>
                {busy ? 'Applying…' : primary.label}
            </Button>
        </li>
    );
}
