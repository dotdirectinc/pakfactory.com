'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Pencil, X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {BriefBuilderRail} from '@/components/request/brief-builder-rail';
import {StepProducts} from '@/components/request/step-products';
import {StepRequirements} from '@/components/request/step-requirements';
import {StepReview} from '@/components/request/step-review';
import {StepServices} from '@/components/request/step-services';
import {StepYourInformation} from '@/components/request/step-your-information';
import type {WizardRailRowData} from '@/components/request/wizard-rail-row';
import {REQUEST_COPY} from '@/lib/copy/request';
import {useRequest} from '@/lib/request/request-provider';
import type {RequestEntryKind} from '@/lib/request/request.storage';
import {
    canSubmitRequest,
    isContactReady,
    isContentsReady,
    isExpressCold,
    isExpressQuantityReady,
    isItemsReady,
    isNotesReady,
    isShippingReady,
    showProductsSection,
    showServicesSection,
} from '@/lib/request/validation';
import {WWW_ROUTES} from '@/lib/www-routes';

const SECTION_TOP_OFFSET = 108;

type BriefBuilderProps = {
    mode?: 'builder' | 'express' | 'products' | 'services';
};

function resolveEntryKind(mode: BriefBuilderProps['mode']): RequestEntryKind {
    if (mode === 'express') return 'express';
    if (mode === 'services') return 'services';
    return 'products';
}

export function BriefBuilder({mode = 'builder'}: BriefBuilderProps) {
    const router = useRouter();
    const {
        lines,
        draft,
        updateDraft,
        removeLine,
        ensureBuilder,
        resetExpress,
    } = useRequest();

    const entryKind = resolveEntryKind(mode);

    const [activeKey, setActiveKey] = useState(
        entryKind === 'express'
            ? 'requirements'
            : entryKind === 'services'
              ? 'services'
              : 'products',
    );
    const [editingTitle, setEditingTitle] = useState(false);
    const [leaveOpen, setLeaveOpen] = useState(false);

    const productsRef = useRef<HTMLElement>(null);
    const servicesRef = useRef<HTMLElement>(null);
    const requirementsRef = useRef<HTMLElement>(null);
    const informationRef = useRef<HTMLElement>(null);
    const reviewRef = useRef<HTMLElement>(null);

    useEffect(() => {
        ensureBuilder({mode: entryKind});
    }, [entryKind, ensureBuilder]);

    const expressCold = isExpressCold(draft);
    const submitted = Boolean(draft.submittedAt && draft.ref);
    const showProducts = showProductsSection(draft, lines);
    const showServices = showServicesSection(draft, lines);

    const itemsReady = isItemsReady(draft, lines);
    const notesReady = isNotesReady(draft);
    const shippingReady = isShippingReady(draft);
    const contactReady = isContactReady(draft);
    const contentsReady = isContentsReady(draft, lines);
    const expressQtyReady = isExpressQuantityReady(draft, lines);
    const canSubmit = canSubmitRequest(draft, lines);

    const railRows: WizardRailRowData[] = useMemo(() => {
        const rows: WizardRailRowData[] = [];
        const servicesFirst = draft.entryKind === 'services';

        const productsRow: WizardRailRowData = {
            key: 'products',
            title: REQUEST_COPY.productsTitle,
            subtitle: REQUEST_COPY.productsSubtitle,
            complete: itemsReady,
        };
        const servicesRow: WizardRailRowData = {
            key: 'services',
            title: REQUEST_COPY.servicesTitle,
            subtitle: REQUEST_COPY.servicesSubtitle,
            complete: draft.services.length > 0 || !draft.servicesEnabled,
        };

        if (servicesFirst) {
            rows.push(servicesRow);
            // Products upsell: always show rail row; body is toggle or full list.
            rows.push(productsRow);
        } else if (draft.entryKind === 'products') {
            rows.push(productsRow);
            // Services upsell: only show rail row when enabled (POC collapse).
            if (draft.servicesEnabled) rows.push(servicesRow);
        } else {
            // express expanded into full rail
            if (showProducts) rows.push(productsRow);
            if (showServices && draft.servicesEnabled) rows.push(servicesRow);
        }

        rows.push({
            key: 'requirements',
            title: REQUEST_COPY.requirementsTitle,
            subtitle: REQUEST_COPY.requirementsSubtitle,
            complete:
                notesReady && shippingReady && contentsReady && expressQtyReady,
        });
        rows.push({
            key: 'information',
            title: REQUEST_COPY.yourInformationTitle,
            subtitle: REQUEST_COPY.yourInformationSubtitle,
            complete: contactReady,
        });
        rows.push({
            key: 'review',
            title: REQUEST_COPY.reviewTitle,
            subtitle: REQUEST_COPY.reviewSubtitle,
            complete: canSubmit,
        });
        return rows;
    }, [
        draft.entryKind,
        draft.services.length,
        draft.servicesEnabled,
        showProducts,
        showServices,
        itemsReady,
        notesReady,
        shippingReady,
        contentsReady,
        expressQtyReady,
        contactReady,
        canSubmit,
    ]);

    const submitHelper =
        !contactReady || !shippingReady
            ? !contentsReady || !expressQtyReady
                ? REQUEST_COPY.submitHelperExpress
                : REQUEST_COPY.submitHelperContact
            : '';

    const sectionRefs: Record<string, React.RefObject<HTMLElement | null>> = {
        products: productsRef,
        services: servicesRef,
        requirements: requirementsRef,
        information: informationRef,
        review: reviewRef,
    };

    function scrollToSection(key: string) {
        const el = sectionRefs[key]?.current;
        if (!el) return;
        const top =
            el.getBoundingClientRect().top + window.scrollY - SECTION_TOP_OFFSET;
        window.scrollTo({top: Math.max(0, top), behavior: 'smooth'});
        setActiveKey(key);
    }

    useEffect(() => {
        function onScroll() {
            const line = SECTION_TOP_OFFSET;
            let current = railRows[0]?.key ?? 'requirements';
            for (const row of railRows) {
                const el = sectionRefs[row.key]?.current;
                if (!el) continue;
                if (el.getBoundingClientRect().top <= line + 8) {
                    current = row.key;
                }
            }
            setActiveKey(current);
        }
        window.addEventListener('scroll', onScroll, {passive: true});
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, [railRows]);

    function onSubmitted(ref: string) {
        updateDraft({
            ref,
            submittedAt: new Date().toISOString(),
        });
    }

    function toggleService(id: string) {
        const next = draft.services.includes(id)
            ? draft.services.filter((s) => s !== id)
            : [...draft.services, id];
        updateDraft({services: next, servicesEnabled: true});
    }

    function handleClose() {
        if (draft.express || draft.entryKind === 'express') {
            resetExpress();
            router.push(WWW_ROUTES.products);
            return;
        }
        setLeaveOpen(true);
    }

    function discardAndLeave() {
        setLeaveOpen(false);
        router.push(WWW_ROUTES.request);
    }

    function saveAndLeave() {
        setLeaveOpen(false);
        router.push(WWW_ROUTES.request);
    }

    const title = draft.title || 'Draft request';
    const hasLeadingSections =
        showProducts || showServices || draft.entryKind === 'services';

    const productsUpsellToggle =
        draft.entryKind === 'services' ? (
            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                        {REQUEST_COPY.productsUpsellTitle}
                    </h2>
                    {REQUEST_COPY.productsUpsellSubtitle ? (
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            {REQUEST_COPY.productsUpsellSubtitle}
                        </p>
                    ) : null}
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={showProducts}
                    onClick={() =>
                        updateDraft({productsExpanded: !showProducts})
                    }
                    className={
                        showProducts
                            ? 'rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background'
                            : 'rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground'
                    }
                >
                    {showProducts ? 'On' : 'Off'}
                </button>
            </div>
        ) : null;

    const productsBlock =
        draft.entryKind === 'services' ? (
            <section
                id="section-products"
                data-section="products"
                ref={productsRef}
                className="border-t border-border/60 py-16"
            >
                {productsUpsellToggle}
                {showProducts ? (
                    <StepProducts
                        lines={lines}
                        onRemove={removeLine}
                        embedded
                    />
                ) : null}
            </section>
        ) : showProducts ? (
            <StepProducts
                lines={lines}
                onRemove={removeLine}
                sectionRef={productsRef}
            />
        ) : null;

    const servicesBlock =
        draft.entryKind === 'products' || showServices ? (
        <StepServices
            services={draft.services}
            servicesEnabled={draft.servicesEnabled}
            onToggleEnabled={(servicesEnabled) =>
                updateDraft({
                    servicesEnabled,
                    ...(servicesEnabled ? {} : {services: []}),
                })
            }
            onToggleService={toggleService}
            sectionRef={servicesRef}
        />
    ) : null;

    if (submitted && draft.ref) {
        return (
            <div className="flex min-h-screen flex-col bg-background">
                <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-border bg-background px-4 sm:px-6 lg:px-8">
                    <div
                        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background"
                        aria-hidden
                    >
                        PF
                    </div>
                    <span className="text-sm font-medium">{title}</span>
                </header>
                <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-start justify-center px-6 py-20 sm:px-10">
                    <h1 className="text-3xl font-semibold tracking-tight">
                        {REQUEST_COPY.quoteRequested}
                    </h1>
                    <p className="mt-3 text-muted-foreground">
                        {REQUEST_COPY.quoteRequestedBody}
                    </p>
                    <p className="mt-4 text-sm font-medium">
                        {REQUEST_COPY.yourRefPrefix} {draft.ref}
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        {draft.entryKind !== 'express' ? (
                            <Button asChild variant="outline">
                                <Link href={WWW_ROUTES.request}>
                                    {REQUEST_COPY.backToYourRequest}
                                </Link>
                            </Button>
                        ) : null}
                        <Button asChild>
                            <Link href={WWW_ROUTES.products}>
                                {REQUEST_COPY.keepBrowsing}
                            </Link>
                        </Button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-border bg-background px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-2.5">
                    <div
                        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background"
                        aria-hidden
                    >
                        PF
                    </div>
                    {editingTitle ? (
                        <input
                            className="h-9 max-w-xs rounded-sm border border-input bg-background px-2 text-sm font-semibold"
                            value={title}
                            autoFocus
                            onChange={(e) => updateDraft({title: e.target.value})}
                            onBlur={() => setEditingTitle(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingTitle(false);
                            }}
                        />
                    ) : (
                        <span className="flex min-w-0 items-center gap-1.5">
                            <button
                                type="button"
                                className="min-w-0 truncate text-left text-sm font-medium hover:underline"
                                onClick={() => setEditingTitle(true)}
                            >
                                {title}
                            </button>
                            <button
                                type="button"
                                aria-label="Rename request"
                                className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                onClick={() => setEditingTitle(true)}
                            >
                                <Pencil className="size-3.5" aria-hidden />
                            </button>
                        </span>
                    )}
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                        onClick={handleClose}
                    >
                        <X className="size-4" aria-hidden />
                        {REQUEST_COPY.close}
                    </Button>
                </div>
            </header>

            <div className="mx-auto flex w-full max-w-7xl flex-1 items-stretch px-4 sm:px-6 lg:px-8">
                <BriefBuilderRail
                    rows={railRows}
                    activeKey={activeKey}
                    onSelect={scrollToSection}
                    refNumber={draft.ref}
                />

                <div className="flex min-w-0 flex-1 flex-col">
                    <main className="flex min-h-[calc(100dvh-68px)] flex-1 flex-col lg:border-l lg:border-r lg:border-dashed lg:border-border lg:pl-10">
                        <div
                            className={cn(
                                'mx-auto w-full max-w-[760px] px-6 sm:px-10',
                                hasLeadingSections
                                    ? 'py-10 sm:py-12'
                                    : 'pb-10 pt-8 sm:pb-12',
                            )}
                        >
                            {draft.entryKind === 'services' ? (
                                <>
                                    {servicesBlock}
                                    {productsBlock}
                                </>
                            ) : (
                                <>
                                    {productsBlock}
                                    {servicesBlock}
                                </>
                            )}

                            <StepRequirements
                                draft={draft}
                                expressCold={
                                    expressCold ||
                                    (draft.entryKind === 'express' && !showProducts)
                                }
                                onPatch={updateDraft}
                                sectionRef={requirementsRef}
                            />
                            <StepYourInformation
                                draft={draft}
                                onPatch={updateDraft}
                                sectionRef={informationRef}
                            />
                        </div>

                        <StepReview
                            draft={draft}
                            lines={lines}
                            submitHelper={submitHelper}
                            onSubmitted={onSubmitted}
                            onEditSection={scrollToSection}
                            sectionRef={reviewRef}
                        />
                    </main>
                </div>
            </div>

            {leaveOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
                        <h2 className="text-lg font-semibold">
                            {REQUEST_COPY.leaveTitle}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {REQUEST_COPY.leaveBody}
                        </p>
                        <div className="mt-6 flex flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setLeaveOpen(false)}
                            >
                                {REQUEST_COPY.leaveCancel}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={discardAndLeave}
                            >
                                {REQUEST_COPY.leaveDiscard}
                            </Button>
                            <Button type="button" onClick={saveAndLeave}>
                                {REQUEST_COPY.leaveSave}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
