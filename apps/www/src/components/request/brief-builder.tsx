'use client';

import {useEffect, useMemo, useRef, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Loader2, Pencil, X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Collapsible,
    CollapsibleContent,
} from '@pakfactory/ui/components/collapsible';
import {cn} from '@pakfactory/ui/lib/utils';
import Logo from '@/components/layout/logo';
import {ExpressPoolBanner} from '@/components/request/express-pool-banner';
import {RequestWizardChrome} from '@/components/request/request-wizard-chrome';
import {
    scrollToRequestWizardSection,
    useRequestWizardScrollSpy,
} from '@/components/request/request-wizard-scroll';
import {StepProducts} from '@/components/request/step-products';
import {StepRequirements} from '@/components/request/step-requirements';
import {StepReview} from '@/components/request/step-review';
import {StepServices} from '@/components/request/step-services';
import {StepYourInformation} from '@/components/request/step-your-information';
import type {WizardRailRowData} from '@/components/request/wizard-rail-row';
import {LeaveDialog} from '@/components/ui/leave-dialog';
import {MessageDialog} from '@/components/ui/message-dialog';
import {REQUEST_COPY} from '@/lib/copy/request';
import {useRequest} from '@/lib/request/request-provider';
import {
    defaultDraftTitle,
    isDraftEmpty,
    type RequestEntryKind,
} from '@/lib/request/request.storage';
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

type BriefBuilderProps = {
    mode?: 'builder' | 'express' | 'products' | 'services';
    /**
     * Skip the mount-time draft start so a wrapper can read the pool before it
     * is reset. Child effects run before parent effects, so the wrapper cannot
     * otherwise observe the pre-entry draft.
     */
    deferStart?: boolean;
};

function resolveEntryKind(mode: BriefBuilderProps['mode']): RequestEntryKind {
    if (mode === 'express') return 'express';
    if (mode === 'services') return 'services';
    return 'products';
}

export function BriefBuilder({
    mode = 'builder',
    deferStart = false,
}: BriefBuilderProps) {
    const router = useRouter();
    const {
        lines,
        builderLines,
        draft,
        updateDraft,
        updateLine,
        removeLine,
        ensureBuilder,
        discardDraft,
    } = useRequest();

    const entryKind = resolveEntryKind(mode);

    // The server snapshot is always a products-entry draft, so until
    // ensureBuilder syncs storage, trust the route. Otherwise sections paint
    // and then vanish.
    const synced = draft.entryKind === entryKind;
    const viewDraft = useMemo(
        () =>
            synced
                ? draft
                : {
                      ...draft,
                      entryKind,
                      express: entryKind === 'express',
                      productsExpanded: false,
                      servicesEnabled: entryKind === 'services',
                  },
        [synced, draft, entryKind],
    );

    const [activeKey, setActiveKey] = useState(
        entryKind === 'express'
            ? 'requirements'
            : entryKind === 'services'
              ? 'services'
              : 'products',
    );
    const [editingTitle, setEditingTitle] = useState(false);
    const [leaveOpen, setLeaveOpen] = useState(false);
    const [leaving, startLeaving] = useTransition();

    // Discarding while the builder is still mounted would blank the form under
    // the user during the navigation, so hold it until the route unmounts us.
    const discardOnLeave = useRef(false);
    useEffect(
        () => () => {
            if (discardOnLeave.current) discardDraft();
        },
        [discardDraft],
    );

    // The draft title is dated and lives only in storage, so it cannot be
    // rendered on the server. Hold a placeholder for the first paint rather
    // than showing an undated title that then changes.
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        setHydrated(true);
    }, []);

    // Acknowledgement over the confirmation page. Component state, not draft
    // state, so revisiting a submitted draft shows the page without the dialog.
    const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);

    const productsRef = useRef<HTMLElement>(null);
    const servicesRef = useRef<HTMLElement>(null);
    const requirementsRef = useRef<HTMLElement>(null);
    const informationRef = useRef<HTMLElement>(null);
    const reviewRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (deferStart) return;
        ensureBuilder({mode: entryKind});
    }, [deferStart, entryKind, ensureBuilder]);

    const expressCold = isExpressCold(viewDraft);
    const locked = Boolean(draft.submittedAt && draft.ref);
    const submittedRef = draft.ref;

    useEffect(() => {
        if (locked) setShowSubmitSuccess(true);
    }, [locked]);

    const showProducts = showProductsSection(viewDraft, builderLines);
    const showServices = showServicesSection(viewDraft, builderLines);

    const itemsReady = isItemsReady(draft, builderLines);
    const notesReady = isNotesReady(draft);
    const shippingReady = isShippingReady(draft);
    const contactReady = isContactReady(draft);
    const contentsReady = isContentsReady(draft, builderLines);
    const expressQtyReady = isExpressQuantityReady(draft, builderLines);
    const canSubmit = canSubmitRequest(draft, builderLines);

    const railRows: WizardRailRowData[] = useMemo(() => {
        const rows: WizardRailRowData[] = [];
        const servicesFirst = viewDraft.entryKind === 'services';

        const productsRow: WizardRailRowData = {
            key: 'products',
            title: REQUEST_COPY.productsTitle,
            subtitle: REQUEST_COPY.productsRailSubtitle,
            complete: itemsReady,
        };
        const servicesRow: WizardRailRowData = {
            key: 'services',
            title: REQUEST_COPY.servicesTitle,
            subtitle: REQUEST_COPY.servicesRailSubtitle,
            complete: draft.servicesEnabled && draft.services.length > 0,
        };

        if (servicesFirst) {
            rows.push(servicesRow);
            // Products upsell: always show rail row; body is toggle or full list.
            rows.push(productsRow);
        } else if (viewDraft.entryKind === 'products') {
            rows.push(productsRow);
            // Services upsell: always in rail; row height collapses when disabled.
            rows.push(servicesRow);
        } else {
            // express expanded into full rail
            if (showProducts) rows.push(productsRow);
            if (showServices && draft.servicesEnabled) rows.push(servicesRow);
        }

        rows.push({
            key: 'requirements',
            title: REQUEST_COPY.requirementsTitle,
            subtitle: REQUEST_COPY.requirementsRailSubtitle,
            complete:
                notesReady && shippingReady && contentsReady && expressQtyReady,
        });
        rows.push({
            key: 'information',
            title: REQUEST_COPY.yourInformationTitle,
            subtitle: REQUEST_COPY.yourInformationRailSubtitle,
            complete: contactReady,
        });
        rows.push({
            key: 'review',
            title: REQUEST_COPY.reviewTitle,
            subtitle: REQUEST_COPY.reviewRailSubtitle,
            complete: canSubmit,
        });
        return rows;
    }, [
        viewDraft.entryKind,
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
        scrollToRequestWizardSection(sectionRefs, key, setActiveKey);
    }

    useRequestWizardScrollSpy(railRows, sectionRefs, setActiveKey);

    function onSubmitted(ref: string) {
        updateDraft({
            ref,
            submittedAt: new Date().toISOString(),
        });
        setShowSubmitSuccess(true);
    }

    function toggleService(id: string) {
        const next = draft.services.includes(id)
            ? draft.services.filter((s) => s !== id)
            : [...draft.services, id];
        updateDraft({services: next, servicesEnabled: true});
    }

    // Derived from the route, not the draft, so the header is right on the
    // first paint. Express is a plain RFQ form: no draft title to name.
    const isExpress = entryKind === 'express';

    function leave() {
        startLeaving(() => {
            router.push(WWW_ROUTES.home);
        });
    }

    function requestLeave() {
        // Express keeps no named draft, so there is nothing to offer to save.
        // Input still persists on every keystroke, so leaving is lossless.
        // Builder products count as work even when form fields are still empty.
        if (
            isExpress ||
            (isDraftEmpty(draft) && builderLines.length === 0)
        ) {
            leave();
            return;
        }
        setLeaveOpen(true);
    }

    // The dialog stays open while the navigation runs so its buttons can carry
    // the pending state; the route change unmounts it.
    function discardAndLeave() {
        discardOnLeave.current = true;
        leave();
    }

    function saveAndLeave() {
        leave();
    }

    function keepBrowsingAfterSubmit() {
        router.push(WWW_ROUTES.products);
    }

    function backToRequestAfterSubmit() {
        router.push(WWW_ROUTES.request);
    }

    const title = draft.title || (hydrated ? defaultDraftTitle() : '');
    const hasLeadingSections =
        showProducts || showServices || viewDraft.entryKind === 'services';

    const productsUpsellToggle =
        viewDraft.entryKind === 'services' ? (
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
        viewDraft.entryKind === 'services' ? (
            <section
                id="section-products"
                data-section="products"
                ref={productsRef}
                className="border-t border-border/60 py-16"
            >
                {productsUpsellToggle}
                {showProducts ? (
                    <StepProducts
                        lines={builderLines}
                        draftId={draft.id}
                        onRemove={removeLine}
                        onUpdate={updateLine}
                        embedded
                    />
                ) : null}
            </section>
        ) : showProducts ? (
            <StepProducts
                lines={builderLines}
                draftId={draft.id}
                onRemove={removeLine}
                onUpdate={updateLine}
                sectionRef={productsRef}
                servicesEnabled={draft.servicesEnabled}
                onServicesEnabledChange={(servicesEnabled) =>
                    updateDraft({
                        servicesEnabled,
                        ...(servicesEnabled ? {} : {services: []}),
                    })
                }
            />
        ) : null;

    const servicesBlock =
        viewDraft.entryKind === 'products' ? (
            <Collapsible open={draft.servicesEnabled}>
                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up-fast data-[state=open]:animate-collapsible-down-fast">
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
                        showEnableToggle={false}
                    />
                </CollapsibleContent>
            </Collapsible>
        ) : showServices ? (
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

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <div
                className="flex min-h-screen flex-1 flex-col"
                {...(locked ? {inert: true} : {})}
            >
            <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-border bg-background px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-2">
                    <button
                        type="button"
                        className="shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={REQUEST_COPY.logoBackAria}
                        disabled={leaving || locked}
                        onClick={requestLeave}
                    >
                        <Logo />
                    </button>
                    <span className="text-border" aria-hidden>
                        |
                    </span>
                    {isExpress ? (
                        <span className="text-sm font-medium">
                            {REQUEST_COPY.expressHeading}
                        </span>
                    ) : editingTitle ? (
                        <input
                            className="h-9 max-w-xs rounded-sm border border-input bg-background px-2 text-sm font-semibold"
                            value={title}
                            autoFocus
                            onChange={(e) =>
                                updateDraft({title: e.target.value})
                            }
                            onBlur={() => setEditingTitle(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingTitle(false);
                            }}
                        />
                    ) : !hydrated ? (
                        <span
                            className="h-4 w-44 animate-pulse rounded bg-muted"
                            aria-hidden
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
                        disabled={leaving || locked}
                        onClick={requestLeave}
                    >
                        {leaving ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden
                            />
                        ) : (
                            <X className="size-4" aria-hidden />
                        )}
                        {REQUEST_COPY.close}
                    </Button>
                </div>
            </header>

            <RequestWizardChrome
                rows={railRows}
                activeKey={activeKey}
                onSelect={scrollToSection}
                refNumber={draft.ref}
                servicesEnabled={draft.servicesEnabled}
            >
                <div
                    className={cn(
                        'mx-auto w-full max-w-[760px] px-6 sm:px-10',
                        hasLeadingSections
                            ? 'pt-6 pb-10 sm:pb-12'
                            : 'pb-10 pt-8 sm:pb-12',
                    )}
                >
                    {viewDraft.entryKind === 'services' ? (
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
                            (viewDraft.entryKind === 'express' && !showProducts)
                        }
                        onPatch={updateDraft}
                        sectionRef={requirementsRef}
                        poolBanner={
                            viewDraft.entryKind === 'express' &&
                            !viewDraft.productsExpanded &&
                            lines.length > 0 ? (
                                <ExpressPoolBanner count={lines.length} />
                            ) : null
                        }
                    />
                    <StepYourInformation
                        draft={draft}
                        onPatch={updateDraft}
                        sectionRef={informationRef}
                    />
                </div>

                <StepReview
                    draft={draft}
                    lines={builderLines}
                    submitHelper={submitHelper}
                    onSubmitted={onSubmitted}
                    onEditSection={scrollToSection}
                    sectionRef={reviewRef}
                />
            </RequestWizardChrome>
            </div>

            <MessageDialog
                open={Boolean(locked && showSubmitSuccess && submittedRef)}
                title={REQUEST_COPY.submitSuccessTitle}
                description={`${REQUEST_COPY.submitSuccessBody} ${REQUEST_COPY.yourRefPrefix} ${submittedRef}`}
                actionLabel={REQUEST_COPY.keepBrowsing}
                onAction={keepBrowsingAfterSubmit}
                onDismiss={keepBrowsingAfterSubmit}
                {...(isExpress
                    ? {}
                    : {
                          secondaryLabel: REQUEST_COPY.backToYourRequest,
                          onSecondary: backToRequestAfterSubmit,
                      })}
            />

            <LeaveDialog
                open={leaveOpen}
                title={REQUEST_COPY.leaveTitle}
                description={REQUEST_COPY.leaveBody}
                cancelLabel={REQUEST_COPY.leaveCancel}
                onCancel={() => setLeaveOpen(false)}
                discardLabel={REQUEST_COPY.leaveDiscard}
                onDiscard={discardAndLeave}
                saveLabel={REQUEST_COPY.leaveSave}
                onSave={saveAndLeave}
                pending={leaving}
            />
        </div>
    );
}
