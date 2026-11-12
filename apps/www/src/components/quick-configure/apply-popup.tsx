'use client';

import {useEffect, useMemo, useState} from 'react';
import {Check, Package, Plus, Search, X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';
import {HighlightItem} from '@pakfactory/ui/components/highlight-item';
import {Input} from '@pakfactory/ui/components/input';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@pakfactory/ui/components/sheet';
import {cn} from '@pakfactory/ui/lib/utils';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {applyCompatibilityQuery} from '@/components/product/compatibility-preselect';
import {QuantityPicker} from '@/components/product/quantity-picker';
import {useQuotePoolDrawer} from '@/components/request/quote-pool-drawer';
import {useLockPageScroll} from '@/components/quick-configure/quick-configure';
import {Icon} from '@/components/ui/icon';
import {SanityImage} from '@/components/ui/sanity-image';
import {showToastCard} from '@/components/ui/toast-card';
import {displayProductSku} from '@/lib/catalog/display-sku';
import {compatibilityProductHref} from '@/lib/catalog/compatibility-product-href';
import type {CompatibilityPropertySelection} from '@/lib/catalog/compatibility-query';
import {isInspirationProduct} from '@/lib/catalog/product-kind';
import {checkApplyTargets, loadQuickProduct} from '@/lib/catalog/load-quick-product';
import type {Product} from '@/lib/catalog/types';
import {REQUEST_COPY} from '@/lib/copy/request';
import {
    buildStepsFromCatalog,
    createEmptyBuilderState,
    resolvePrintableSides,
    toRequestCustomizations,
} from '@/lib/customization-builder';
import {useRequest} from '@/lib/request/request-provider';

/**
 * PROD-3312 — Apply a customization to one or more products.
 * Two-step shell (choose packaging → quantity & review), same Dialog/Sheet
 * chrome as the customization builder.
 */
export type ApplySuggestion = {
    slug: string;
    title: string;
    imageUrl?: string | null;
    sku?: string;
    productLineSlug?: string;
    productLineTitle?: string;
    /** @deprecated Prefer productLineTitle. */
    lineTitle?: string;
};

export type ApplyRequest = {
    option: {
        category: string;
        slug: string;
        title: string;
        achievedBySlug?: string;
    };
    /** Property picks carried from the customization page (PROD-3174). */
    properties?: CompatibilityPropertySelection[];
    /** Human summary of the property choice, e.g. "Metallic · Gold". */
    choiceSummary?: string;
    /** Category label for the review row, e.g. "Finishing". */
    categoryTitle?: string;
    /** Compatible styles (Works with / compare). */
    suggestions?: ApplySuggestion[];
    /** Product-line filters for the compatible tab. */
    lines?: {slug: string; title: string}[];
    /** Skip step 1 and open quantity review for this product. */
    initialProductSlug?: string;
    /** @deprecated Unused — kept for older call sites. */
    seeAllHref?: string;
};

type ApplyStep = 1 | 2;

type SelectableProduct = {
    key: string;
    slug: string;
    title: string;
    sku?: string;
    productLineSlug?: string;
    productLineTitle?: string;
    imageUrl?: string | null;
    /** Existing request line to update in place when present. */
    lineId?: string;
    /** Already in the open request (and can take this option). */
    inRequest?: boolean;
};

/** Left-rail filter: request-only, all compatible, or a product-line slug. */
type SideFilter = 'request' | 'all' | string;

type LoadedProduct = {
    product: Product;
    quantities: number[];
};

function useBelowLg() {
    const [belowLg, setBelowLg] = useState(() =>
        typeof window !== 'undefined'
            ? window.matchMedia('(max-width: 1023px)').matches
            : false,
    );
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 1023px)');
        const onChange = () => setBelowLg(mq.matches);
        onChange();
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return belowLg;
}

function humanizeSlug(slug: string): string {
    return slug
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function choiceLabel(
    choiceSummary: string | undefined,
    properties: CompatibilityPropertySelection[],
): string | null {
    if (choiceSummary?.trim()) return choiceSummary.trim();
    const values = properties.flatMap((p) => p.valueSlugs).map(humanizeSlug);
    if (!values.length) return null;
    return values.join(' · ');
}

function queryFor(
    slug: string,
    option: ApplyRequest['option'],
    properties: CompatibilityPropertySelection[],
): string {
    return (
        compatibilityProductHref(
            slug,
            {
                category: option.category,
                slug: option.slug,
                ...(option.achievedBySlug
                    ? {achievedBySlug: option.achievedBySlug}
                    : {}),
            },
            properties,
        ).split('?')[1] ?? ''
    );
}

export function ApplyPopup({
    request,
    onClose,
}: {
    request: ApplyRequest;
    onClose: () => void;
}) {
    const {
        option,
        properties = [],
        choiceSummary,
        suggestions = [],
        lines: lineFilters = [],
        initialProductSlug,
    } = request;
    const choice = choiceLabel(choiceSummary, properties);
    const {lines, addLine, updateLine} = useRequest();
    const {openQuotePoolDrawer} = useQuotePoolDrawer();
    const belowLg = useBelowLg();
    useLockPageScroll();

    const [step, setStep] = useState<ApplyStep>(
        initialProductSlug ? 2 : 1,
    );
    const [sideFilter, setSideFilter] = useState<SideFilter>('all');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<string[]>(() =>
        initialProductSlug ? [initialProductSlug] : [],
    );
    const [requestOk, setRequestOk] = useState<
        Record<string, boolean | undefined>
    >({});
    const [loaded, setLoaded] = useState<Record<string, LoadedProduct>>({});
    const [loadingStep2, setLoadingStep2] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const requestCandidates = useMemo((): SelectableProduct[] => {
        return lines.map((line) => ({
            key: `line:${line.id}`,
            slug: line.productSlug,
            title: line.productTitle ?? line.productSlug,
            sku: line.productSku,
            productLineTitle: line.productLineTitle,
            imageUrl: line.productMedia?.[0]?.src,
            lineId: line.id,
        }));
    }, [lines]);

    const requestSlugs = useMemo(
        () => requestCandidates.map((c) => c.slug).sort().join('|'),
        [requestCandidates],
    );

    useEffect(() => {
        let live = true;
        const slugs = requestSlugs ? requestSlugs.split('|').filter(Boolean) : [];
        if (!slugs.length) {
            setRequestOk({});
            return;
        }
        checkApplyTargets(slugs, {
            category: option.category,
            slug: option.slug,
        })
            .then((res) => {
                if (!live) return;
                setRequestOk(
                    Object.fromEntries(res.map((r) => [r.slug, r.ok])),
                );
            })
            .catch(() => undefined);
        return () => {
            live = false;
        };
    }, [requestSlugs, option.category, option.slug]);

    const requestProducts = useMemo(
        () =>
            requestCandidates.filter((c) => {
                const ok = requestOk[c.slug];
                return ok !== false;
            }),
        [requestCandidates, requestOk],
    );

    const compatibleProducts = useMemo((): SelectableProduct[] => {
        return suggestions.map((s) => {
            const lineId = lines.find((l) => l.productSlug === s.slug)?.id;
            return {
                key: `s:${s.slug}`,
                slug: s.slug,
                title: s.title,
                sku: s.sku,
                productLineSlug: s.productLineSlug,
                productLineTitle: s.productLineTitle ?? s.lineTitle,
                imageUrl: s.imageUrl,
                lineId,
                inRequest: Boolean(lineId),
            };
        });
    }, [suggestions, lines]);

    /** One card per slug — request + compatible, request wins for lineId. */
    const catalogProducts = useMemo((): SelectableProduct[] => {
        const bySlug = new Map<string, SelectableProduct>();
        for (const p of compatibleProducts) {
            bySlug.set(p.slug, p);
        }
        for (const p of requestProducts) {
            const existing = bySlug.get(p.slug);
            const lineFromTitle = p.productLineTitle
                ? lineFilters.find((l) => l.title === p.productLineTitle)
                : undefined;
            bySlug.set(p.slug, {
                ...p,
                productLineSlug:
                    existing?.productLineSlug ??
                    p.productLineSlug ??
                    lineFromTitle?.slug,
                productLineTitle:
                    p.productLineTitle ??
                    existing?.productLineTitle ??
                    lineFromTitle?.title,
                imageUrl: p.imageUrl ?? existing?.imageUrl,
                sku: p.sku ?? existing?.sku,
                inRequest: true,
            });
        }
        return [...bySlug.values()];
    }, [compatibleProducts, requestProducts, lineFilters]);

    const lineChipSource = useMemo(() => {
        if (lineFilters.length) {
            return lineFilters.map((line) => ({
                slug: line.slug,
                title: line.title,
                count: catalogProducts.filter(
                    (p) =>
                        p.productLineSlug === line.slug ||
                        p.productLineTitle === line.title,
                ).length,
            }));
        }
        const counts = new Map<string, {title: string; count: number}>();
        for (const p of catalogProducts) {
            const slug = p.productLineSlug ?? p.productLineTitle ?? 'other';
            const title = p.productLineTitle ?? humanizeSlug(slug);
            const prev = counts.get(slug);
            counts.set(slug, {
                title,
                count: (prev?.count ?? 0) + 1,
            });
        }
        return [...counts.entries()].map(([slug, v]) => ({
            slug,
            title: v.title,
            count: v.count,
        }));
    }, [lineFilters, catalogProducts]);

    const filtered = useMemo(() => {
        let pool: SelectableProduct[];
        if (sideFilter === 'request') {
            pool = requestProducts.map((p) => ({...p, inRequest: true}));
        } else if (sideFilter === 'all') {
            pool = catalogProducts;
        } else {
            pool = catalogProducts.filter(
                (p) =>
                    p.productLineSlug === sideFilter ||
                    p.productLineTitle === sideFilter,
            );
        }
        const q = search.trim().toLowerCase();
        const searched = q
            ? pool.filter(
                  (p) =>
                      p.title.toLowerCase().includes(q) ||
                      (p.sku ?? '').toLowerCase().includes(q) ||
                      (p.productLineTitle ?? '').toLowerCase().includes(q) ||
                      p.slug.toLowerCase().includes(q),
              )
            : pool;
        if (sideFilter === 'request') return searched;
        return [...searched].sort((a, b) => {
            const aIn = a.inRequest ? 0 : 1;
            const bIn = b.inRequest ? 0 : 1;
            if (aIn !== bIn) return aIn - bIn;
            return a.title.localeCompare(b.title);
        });
    }, [sideFilter, requestProducts, catalogProducts, search]);

    const selectedProducts = useMemo(() => {
        const bySlug = new Map<string, SelectableProduct>();
        for (const p of [...compatibleProducts, ...requestProducts]) {
            if (!bySlug.has(p.slug)) bySlug.set(p.slug, p);
        }
        // Ensure initial / selected slugs missing from lists still appear.
        for (const slug of selected) {
            if (bySlug.has(slug)) continue;
            const line = lines.find((l) => l.productSlug === slug);
            bySlug.set(slug, {
                key: `sel:${slug}`,
                slug,
                title: line?.productTitle ?? slug,
                sku: line?.productSku,
                productLineTitle: line?.productLineTitle,
                imageUrl: line?.productMedia?.[0]?.src,
                lineId: line?.id,
            });
        }
        return selected
            .map((slug) => bySlug.get(slug))
            .filter((p): p is SelectableProduct => Boolean(p));
    }, [selected, compatibleProducts, requestProducts, lines]);

    function toggleSelect(slug: string) {
        setSelected((prev) =>
            prev.includes(slug)
                ? prev.filter((s) => s !== slug)
                : [...prev, slug],
        );
    }

    async function ensureLoaded(slugs: string[]) {
        const missing = slugs.filter((s) => !loaded[s]);
        if (!missing.length) return loaded;
        const entries = await Promise.all(
            missing.map(async (slug) => {
                const data = await loadQuickProduct(slug).catch(() => null);
                return [slug, data] as const;
            }),
        );
        const next = {...loaded};
        for (const [slug, data] of entries) {
            if (!data) continue;
            next[slug] = {
                product: data.product,
                quantities: loaded[slug]?.quantities ?? [],
            };
        }
        setLoaded(next);
        return next;
    }

    async function goContinue() {
        if (!selected.length) return;
        setLoadingStep2(true);
        const next = await ensureLoaded(selected);
        setLoadingStep2(false);
        const failed = selected.filter((s) => !next[s]);
        if (failed.length) {
            showToastCard({
                title: `Couldn’t load ${failed.length === 1 ? 'a product' : 'some products'}`,
                description: 'Try again, or pick a different style.',
                dismissLabel: REQUEST_COPY.close,
            });
            return;
        }
        setStep(2);
    }

    function setQuantities(slug: string, quantities: number[]) {
        setLoaded((prev) => {
            const entry = prev[slug];
            if (!entry) return prev;
            return {
                ...prev,
                [slug]: {...entry, quantities},
            };
        });
    }

    const missingQty = selectedProducts.filter((p) => {
        const qs = loaded[p.slug]?.quantities ?? [];
        return qs.length === 0;
    }).length;
    const canAdd =
        selectedProducts.length > 0 &&
        missingQty === 0 &&
        selectedProducts.every((p) => Boolean(loaded[p.slug]));

    async function applyOne(
        sel: SelectableProduct,
        product: Product,
        quantities: number[],
    ): Promise<boolean> {
        const searchParams = new URLSearchParams(
            queryFor(product.slug, option, properties),
        );
        const existing = sel.lineId
            ? lines.find((l) => l.id === sel.lineId)
            : lines.find((l) => l.productSlug === product.slug);
        const base =
            existing?.customizationBuilder ?? createEmptyBuilderState();
        const result = applyCompatibilityQuery(product, base, searchParams);
        if (!result) {
            showToastCard({
                title: `Couldn’t apply ${option.title}`,
                description: `Not available on ${product.title}.`,
                dismissLabel: REQUEST_COPY.close,
            });
            return false;
        }
        const printableSides = resolvePrintableSides(product.properties);
        const customizations = toRequestCustomizations(
            result.state,
            CUSTOMIZATION_BUILDER_COPY.specialistToAdvise,
            buildStepsFromCatalog(product.availableCustomizations),
            printableSides,
        );
        if (existing) {
            updateLine(existing.id, {
                customizationBuilder: result.state,
                customizations,
                quantities,
            });
            return true;
        }
        addLine({
            productSlug: product.slug,
            productTitle: product.title,
            productSku: product.sku,
            productLineTitle: product.productLine.title,
            ...(product.moq ? {productMoq: product.moq} : {}),
            productMedia: product.media,
            availableCustomizations: product.availableCustomizations,
            ...(product.customizationRules
                ? {customizationRules: product.customizationRules}
                : {}),
            ...(product.dimensionInput
                ? {dimensionInput: product.dimensionInput}
                : {}),
            ...(product.dimensionRange
                ? {dimensionRange: product.dimensionRange}
                : {}),
            ...(printableSides.length ? {printableSides} : {}),
            quantities,
            contents: '',
            customizations,
            customizationBuilder: result.state,
        });
        return true;
    }

    async function confirmAdd() {
        if (!canAdd || submitting) return;
        setSubmitting(true);
        let ok = true;
        for (const sel of selectedProducts) {
            const entry = loaded[sel.slug];
            if (!entry) {
                ok = false;
                break;
            }
            const applied = await applyOne(sel, entry.product, entry.quantities);
            if (!applied) {
                ok = false;
                break;
            }
        }
        setSubmitting(false);
        if (!ok) return;
        onClose();
        openQuotePoolDrawer();
    }

    // Prefetch when landing on step 2 from a product card.
    useEffect(() => {
        if (step !== 2 || !selected.length) return;
        void ensureLoaded(selected);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per step/selection entry
    }, [step]);

    const title =
        step === 1
            ? `Which packaging is ${option.title} for?`
            : 'Add a quantity and review';
    const description =
        step === 1
            ? choice
                ? `Your choice: ${choice}. Pick one or more.`
                : 'Pick one or more packaging styles.'
            : 'Each product needs a quantity of at least its minimum order. You can still change everything in the request.';

    const body = (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {step === 1 ? (
                <div className="min-h-0 flex-1 overflow-hidden">
                    <Step1
                        sideFilter={sideFilter}
                        setSideFilter={setSideFilter}
                        search={search}
                        setSearch={setSearch}
                        filtered={filtered}
                        selected={selected}
                        toggleSelect={toggleSelect}
                        catalogCount={catalogProducts.length}
                        requestCount={requestProducts.length}
                        lineChips={lineChipSource}
                        checkingRequest={
                            requestCandidates.length > 0 &&
                            Object.keys(requestOk).length === 0
                        }
                    />
                </div>
            ) : (
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                    <Step2
                        products={selectedProducts}
                        loaded={loaded}
                        setQuantities={setQuantities}
                        loading={loadingStep2}
                    />
                </div>
            )}
            <Footer
                step={step}
                selectedCount={selected.length}
                productCount={selectedProducts.length}
                missingQty={missingQty}
                canContinue={selected.length > 0 && !loadingStep2}
                canAdd={canAdd && !submitting}
                onClear={() => setSelected([])}
                onContinue={() => void goContinue()}
                onChangePackaging={() => setStep(1)}
                onAdd={() => void confirmAdd()}
                continuing={loadingStep2}
                submitting={submitting}
            />
        </div>
    );

    if (belowLg) {
        return (
            <Sheet open onOpenChange={(o) => !o && onClose()}>
                <SheetContent
                    side="bottom"
                    showCloseButton={false}
                    className="inset-0 flex h-dvh w-full max-w-none flex-col gap-0 rounded-none border-0 bg-background p-0"
                >
                    <SheetHeader className="shrink-0 gap-1 border-b border-border px-5 py-4 pr-12 text-left sm:px-7">
                        <SheetTitle className="text-lg font-semibold tracking-tight">
                            {title}
                        </SheetTitle>
                        <SheetDescription className="text-sm text-muted-foreground">
                            {description}
                        </SheetDescription>
                    </SheetHeader>
                    {body}
                    <SheetClose className="absolute top-4 right-4 z-10 flex size-8 cursor-pointer items-center justify-center rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden">
                        <Icon icon={X} size="sm" />
                        <span className="sr-only">{REQUEST_COPY.close}</span>
                    </SheetClose>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="flex h-[min(720px,85vh)] max-h-[85vh] w-full max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
                <DialogHeader className="shrink-0 gap-1 border-b border-border px-5 py-4 pr-12 text-left sm:px-6">
                    <DialogTitle className="text-lg font-semibold tracking-tight">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                {body}
            </DialogContent>
        </Dialog>
    );
}

function Step1({
    sideFilter,
    setSideFilter,
    search,
    setSearch,
    filtered,
    selected,
    toggleSelect,
    catalogCount,
    requestCount,
    lineChips,
    checkingRequest,
}: {
    sideFilter: SideFilter;
    setSideFilter: (v: SideFilter) => void;
    search: string;
    setSearch: (v: string) => void;
    filtered: SelectableProduct[];
    selected: string[];
    toggleSelect: (slug: string) => void;
    catalogCount: number;
    requestCount: number;
    lineChips: {slug: string; title: string; count: number}[];
    checkingRequest: boolean;
}) {
    const visibleLines = lineChips.filter((c) => c.count > 0);

    const productGrid = filtered.length ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
                <li key={p.key} className="h-full">
                    <SelectProductCard
                        product={p}
                        selected={selected.includes(p.slug)}
                        onToggle={() => toggleSelect(p.slug)}
                    />
                </li>
            ))}
        </ul>
    ) : (
        <p className="py-8 text-sm text-muted-foreground">
            {sideFilter === 'request'
                ? checkingRequest
                    ? 'Checking which request items can take this customization…'
                    : 'No products in your request can take this customization yet.'
                : 'No styles match this filter or search.'}
        </p>
    );

    return (
        <div className="relative grid h-full min-h-0 flex-1 overflow-hidden md:grid-cols-[minmax(220px,16rem)_minmax(0,1fr)]">
            <nav
                aria-label="Packaging filters"
                className="min-h-0 min-w-0 overflow-y-auto border-b border-border md:border-b-0 md:border-r"
            >
                <div className="flex flex-col gap-2 px-3 py-3">
                    <HighlightItem
                        selected={sideFilter === 'request'}
                        onClick={() => setSideFilter('request')}
                        className="flex w-full min-w-0 flex-col gap-1"
                    >
                        <span className="text-sm font-medium">
                            In your request
                        </span>
                        <span className="text-xs text-muted-foreground">
                            Already in this quote
                            {checkingRequest
                                ? ' · Checking…'
                                : ` · ${requestCount}`}
                        </span>
                    </HighlightItem>

                    <div className="my-1 border-b border-border" />

                    <HighlightItem
                        selected={sideFilter === 'all'}
                        onClick={() => setSideFilter('all')}
                        className="flex w-full min-w-0 items-center gap-2"
                    >
                        <span className="min-w-0 flex-1 text-sm font-medium">
                            All
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {catalogCount}
                        </span>
                    </HighlightItem>
                    {visibleLines.map((c) => (
                        <HighlightItem
                            key={c.slug}
                            selected={sideFilter === c.slug}
                            onClick={() => setSideFilter(c.slug)}
                            className="flex w-full min-w-0 items-center gap-2"
                        >
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                {c.title}
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                {c.count}
                            </span>
                        </HighlightItem>
                    ))}
                </div>
            </nav>

            <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto px-5 py-5">
                <div className="mb-4 relative w-full sm:max-w-xs sm:self-end">
                    <Icon
                        icon={Search}
                        size="sm"
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search packaging styles"
                        className="pl-9"
                    />
                </div>
                {productGrid}
            </div>
        </div>
    );
}

function Step2({
    products,
    loaded,
    setQuantities,
    loading,
}: {
    products: SelectableProduct[];
    loaded: Record<string, LoadedProduct>;
    setQuantities: (slug: string, quantities: number[]) => void;
    loading: boolean;
}) {
    if (loading) {
        return (
            <p className="py-8 text-sm text-muted-foreground">
                Loading products…
            </p>
        );
    }

    return (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {products.map((p) => {
                const entry = loaded[p.slug];
                const product = entry?.product;
                const quantities = entry?.quantities ?? [];
                const moq = product?.moq ?? null;
                const inspiration = product
                    ? isInspirationProduct(product)
                    : false;
                const lineTitle =
                    product?.productLine.title ?? p.productLineTitle;
                const sku = displayProductSku(
                    product?.sku ?? p.sku,
                    p.slug,
                );
                const imageUrl =
                    product?.media[0]?.src ?? p.imageUrl ?? null;

                return (
                    <li
                        key={p.key}
                        className="rounded-xl border border-border bg-background p-4"
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                            <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-24">
                                {imageUrl ? (
                                    <SanityImage
                                        src={imageUrl}
                                        alt={p.title}
                                        fill
                                        square
                                        className="object-cover"
                                        sizes="96px"
                                    />
                                ) : (
                                    <span className="flex size-full items-center justify-center">
                                        <Icon
                                            icon={Package}
                                            className="size-8 text-muted-foreground/50"
                                        />
                                    </span>
                                )}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs text-muted-foreground">
                                        {[lineTitle, sku !== '-' ? sku : null]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                    <p className="text-base font-semibold tracking-tight text-foreground">
                                        {product?.title ?? p.title}
                                    </p>
                                </div>
                                {inspiration ? (
                                    <CustomizationRow
                                        label="As shown"
                                        value="Inspiration design"
                                    />
                                ) : null}
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm font-medium text-foreground">
                                        How many quantities?{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </p>
                                    <QuantityPicker
                                        volumes={quantities}
                                        onAdd={(n) =>
                                            setQuantities(
                                                p.slug,
                                                [...quantities, n].sort(
                                                    (a, b) => a - b,
                                                ),
                                            )
                                        }
                                        onRemove={(n) =>
                                            setQuantities(
                                                p.slug,
                                                quantities.filter(
                                                    (q) => q !== n,
                                                ),
                                            )
                                        }
                                        moq={moq}
                                        menuLayout="inFlow"
                                    />
                                </div>
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

function CustomizationRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/60 px-4 py-2 text-sm">
            <span className="min-w-0 truncate text-foreground">{label}</span>
            <span className="shrink-0 font-medium text-foreground">{value}</span>
        </div>
    );
}

function SelectProductCard({
    product,
    selected,
    onToggle,
}: {
    product: SelectableProduct;
    selected: boolean;
    onToggle: () => void;
}) {
    const sku = displayProductSku(product.sku, product.slug);
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={selected}
            className={cn(
                'flex h-full w-full flex-col overflow-hidden rounded-xl border bg-background text-left transition-colors',
                selected
                    ? 'border-foreground ring-1 ring-foreground'
                    : 'border-border hover:border-foreground/40',
            )}
        >
            <div className="relative aspect-square w-full shrink-0 bg-muted">
                {product.imageUrl ? (
                    <SanityImage
                        src={product.imageUrl}
                        alt={product.title}
                        fill
                        square
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 25vw"
                    />
                ) : (
                    <span className="flex size-full items-center justify-center">
                        <Icon
                            icon={Package}
                            className="size-10 text-muted-foreground/50"
                        />
                    </span>
                )}
                <span
                    className={cn(
                        'absolute top-2 right-2 flex size-8 items-center justify-center rounded-full border text-sm font-semibold',
                        selected
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-background text-muted-foreground',
                    )}
                    aria-hidden
                >
                    {selected ? (
                        <Icon icon={Check} size="sm" />
                    ) : (
                        <Icon icon={Plus} size="sm" />
                    )}
                </span>
            </div>
            <div className="flex min-h-[4.5rem] flex-1 flex-col gap-1 p-4">
                <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {[product.productLineTitle, sku !== '-' ? sku : null]
                        .filter(Boolean)
                        .join(' · ') || 'Packaging'}
                </span>
                <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                    {product.title}
                </span>
            </div>
        </button>
    );
}

function Footer({
    step,
    selectedCount,
    productCount,
    missingQty,
    canContinue,
    canAdd,
    onClear,
    onContinue,
    onChangePackaging,
    onAdd,
    continuing,
    submitting,
}: {
    step: ApplyStep;
    selectedCount: number;
    productCount: number;
    missingQty: number;
    canContinue: boolean;
    canAdd: boolean;
    onClear: () => void;
    onContinue: () => void;
    onChangePackaging: () => void;
    onAdd: () => void;
    continuing: boolean;
    submitting: boolean;
}) {
    return (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
            {step === 1 ? (
                <>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-foreground">
                            {selectedCount} selected
                        </span>
                        {selectedCount > 0 ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={onClear}
                                className="h-auto px-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
                            >
                                Clear
                            </Button>
                        ) : null}
                    </div>
                    <Button
                        type="button"
                        size="lg"
                        disabled={!canContinue}
                        onClick={onContinue}
                    >
                        {continuing
                            ? 'Loading…'
                            : `Continue (${selectedCount})`}
                    </Button>
                </>
            ) : (
                <>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onChangePackaging}
                        className="h-auto px-0 text-sm"
                    >
                        ← Change packaging
                    </Button>
                    <div className="flex flex-wrap items-center gap-3">
                        {!canAdd && missingQty > 0 ? (
                            <span className="text-sm text-muted-foreground">
                                Add a quantity to {missingQty} more
                            </span>
                        ) : null}
                        <Button
                            type="button"
                            size="lg"
                            disabled={!canAdd}
                            onClick={onAdd}
                        >
                            {submitting
                                ? 'Adding…'
                                : `Add ${productCount} product${productCount === 1 ? '' : 's'} to request`}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
