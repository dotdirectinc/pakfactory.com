'use client';

import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';
import Link from 'next/link';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@pakfactory/ui/components/sheet';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {ApplyPopup, type ApplyRequest} from '@/components/quick-configure/apply-popup';
import {ProductPdpDraftProvider} from '@/components/product/product-pdp-draft';
import {ProductRequestRail} from '@/components/product/product-request-rail';
import type {Product} from '@/lib/catalog/types';
import {productHref} from '@/lib/www-routes';
import {loadQuickProduct} from '@/lib/catalog/load-quick-product';

/**
 * F24 Quick configure (Product & Customization PRD v0.2).
 *
 * One drawer for the whole site: any "Apply / Add to request" opens the
 * product's own builder (the PDP's ProductRequestRail, unchanged) over the
 * current page, with an optional customization preselected through the same
 * compatibility query the PDP reads from its address. Add to request goes into
 * the open request and closes the drawer.
 */
export type QuickTarget = {
    slug: string;
    /** Compatibility query, same format as the PDP URL (`withCompatibilityQuery`). */
    query?: string;
    /** Shown while the product loads. */
    title?: string;
};

type QuickConfigureValue = {
    /** Always true once the provider is mounted; false outside it (callers keep their link). */
    enabled: boolean;
    open: (target: QuickTarget) => void;
    /** F25: "Apply to a product" — the buyer's items first, then compatible products. */
    openApply: (request: ApplyRequest) => void;
};

const QuickConfigureContext = createContext<QuickConfigureValue>({enabled: false, open: () => {}, openApply: () => {}});

export function useQuickConfigure(): QuickConfigureValue {
    return useContext(QuickConfigureContext);
}

/** `/products/<slug>?<query>` → a drawer target; null for anything else. */
export function quickTargetFromHref(href: string, title?: string): QuickTarget | null {
    const m = href.match(/^\/products\/([^/?#]+)(?:\?([^#]*))?/);
    if (!m) return null;
    return {slug: decodeURIComponent(m[1]!), ...(m[2] ? {query: m[2]} : {}), ...(title ? {title} : {})};
}

export function QuickConfigureProvider({children}: {children: ReactNode}) {
    const enabled = true;
    const [target, setTarget] = useState<QuickTarget | null>(null);
    const [apply, setApply] = useState<ApplyRequest | null>(null);
    const open = useCallback((t: QuickTarget) => setTarget(t), []);
    const openApply = useCallback((r: ApplyRequest) => setApply(r), []);
    const value = useMemo(() => ({enabled, open, openApply}), [enabled, open, openApply]);
    return (
        <QuickConfigureContext.Provider value={value}>
            {children}
            {enabled && apply ? <ApplyPopup request={apply} onClose={() => setApply(null)} /> : null}
            {enabled && target ? <QuickConfigureDrawer key={`${target.slug}?${target.query ?? ''}`} target={target} onClose={() => setTarget(null)} /> : null}
        </QuickConfigureContext.Provider>
    );
}

type Loaded = {product: Product} | null;

/** While a drawer or popup is open the page behind it doesn't scroll (one scrollbar, the drawer's). */
export function useLockPageScroll() {
    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const prev = {html: html.style.overflow, body: body.style.overflow};
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        return () => {
            html.style.overflow = prev.html;
            body.style.overflow = prev.body;
        };
    }, []);
}

function QuickConfigureDrawer({target, onClose}: {target: QuickTarget; onClose: () => void}) {
    const [data, setData] = useState<Loaded | undefined>(undefined);
    useLockPageScroll();
    useEffect(() => {
        let live = true;
        loadQuickProduct(target.slug)
            .then((r) => {
                if (live) setData(r);
            })
            .catch(() => {
                if (live) setData(null);
            });
        return () => {
            live = false;
        };
    }, [target.slug]);

    const product = data?.product;
    const orderable = product ? !product.status || product.status === 'active' : false;
    const fullHref = `${productHref(target.slug)}${target.query ? `?${target.query}` : ''}`;
    const thumb = product?.media[0];

    return (
        <Sheet open onOpenChange={(o) => !o && onClose()}>
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
                <SheetHeader className="border-b border-border">
                    <SheetTitle className="text-xl">{product?.title ?? target.title ?? 'Loading…'}</SheetTitle>
                    <SheetDescription>
                        {product ? product.productLine.title : 'Configure and add to your request without leaving this page.'}
                    </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-4 p-4">
                    {data === undefined ? (
                        <div className="flex flex-col gap-3" aria-busy>
                            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                            <Skeleton className="h-10 w-full rounded-md" />
                            <Skeleton className="h-10 w-3/4 rounded-md" />
                            <Skeleton className="h-12 w-full rounded-md" />
                        </div>
                    ) : !product ? (
                        <p className="text-sm text-muted-foreground">
                            This product couldn’t be loaded. <Link className="underline" href={fullHref}>Open the product page</Link>.
                        </p>
                    ) : (
                        <>
                            {thumb?.src ? (
                                <img src={thumb.src} alt={thumb.alt ?? product.title} className="aspect-[4/3] w-full rounded-lg bg-muted object-cover" />
                            ) : null}
                            {orderable ? (
                                <ProductPdpDraftProvider product={product} inDrawer preselectQuery={target.query} onAdded={onClose}>
                                    <ProductRequestRail />
                                </ProductPdpDraftProvider>
                            ) : (
                                <p className="text-sm text-muted-foreground">This product can’t be requested right now.</p>
                            )}
                        </>
                    )}
                    <Link href={fullHref} onClick={onClose} className="text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                        View full product page
                    </Link>
                </div>
            </SheetContent>
        </Sheet>
    );
}
