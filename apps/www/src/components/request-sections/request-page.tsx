'use client';

import {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {SectionReveal} from '@/components/common/section-reveal';
import {IntakeContactScreen} from '@/components/intake/screens/intake-contact-screen';
import {ProjectDetailsScreen} from '@/components/intake/screens/project-details-screen';
import {RequestShell} from '@/components/request-sections/request-shell';
import {RequestSectionsSubmit} from '@/components/request-sections/request-sections-submit';
import {SECTION_FOLD_MS, SectionShell, type SectionState} from '@/components/request-sections/section-shell';
import {ProductsSection} from '@/components/request-sections/sections/products-section';
import {ServicesAddCard} from '@/components/request-sections/sections/services-add-card';
import {GENERAL_REQUEST_FLOW} from '@/lib/intake/flows/general';
import {isServicesStepReady} from '@/lib/intake/flows/services-ready';
import {draftNeeds} from '@/lib/intake/needs';
import type {IntakeContext} from '@/lib/intake/types';
import {REQUEST_COPY} from '@/lib/copy/request';
import {entryFrom, trackFunnel} from '@/lib/request/funnel';
import {useRequest} from '@/lib/request/request-provider';
import type {RequestDraft, RequestLine} from '@/lib/request/request.storage';
import type {RequestServiceOption} from '@/lib/request/service-option';
import {formatAddressSummaryLine} from '@/lib/request/shipping-address';
import {isIntakeContactReady, isItemsReady, isShippingReady} from '@/lib/request/validation';
import {REQUEST_SECTIONS, SECTION_TITLE, type SectionKey} from '@/lib/request-sections/flow';
import {trackSectionDone, trackSectionOpen} from '@/lib/request-sections/events';
import {submittedHref, type RequestKind} from '@/lib/request-sections/url';
import {blockedReason} from '@/lib/request-sections/blocked';
import {anchorHeaderToWorkBand} from '@/lib/request-sections/scroll-anchor';
import {releaseGeneralSession} from '@/lib/request-sections/start';
import {leaveToolShell} from '@/lib/ui/tool-shell-return';

/** Section bodies are static so Continue unfolds with fields already painted (proto A feel). */

/**
 * Sectioned request page: `/request`, one page in the focused shell, filled
 * section by section — Products (product request) → Project summary → Contact.
 * Submit lives inside open Contact. Each finished section collapses to a summary
 * with Edit. Everything autosaves (the draft store). PORTABLE: rules come in as a prop.
 */
export function RequestPage({
    serviceOptions = [],
    rules = {},
}: {
    serviceOptions?: RequestServiceOption[];
    rules?: IntakeContext['rules'];
}) {
    const router = useRouter();
    const {draft, viewer, lines: pool, builderLines, updateDraft, discardDraft, consumeSubmittedLines} = useRequest();
    const leaving = useRef(false);
    const opened = useRef(new Set<string>());
    // Scroll settle only after Continue / Edit — not on entry from /products or draft id churn.
    const scrollOnNextOpen = useRef(false);
    // Open step is held in React only (no ?step= URL) so Continue does not remount via useSearchParams.
    const [heldStep, setHeldStep] = useState<SectionKey | null>(null);
    // First land locks here (sync) — an effect seed would still track firstOpen for one paint.
    const landedStep = useRef<SectionKey | null>(null);
    // v0.4: the kind is in the path (/request/products, /request/general); the page shows the saved request of that kind.
    const flow: RequestKind = draft.express ? 'general' : 'product';
    const leadId = draft.id;
    const sections = REQUEST_SECTIONS[flow];
    const lines = flow === 'product' ? builderLines : [];
    const ctx: IntakeContext = {draft, lines, signedIn: Boolean(viewer), rules: {...rules, companyAddressOptional: true}};
    const ok =
        !draft.submittedAt && (flow === 'general' ? draft.entryKind === 'express' : draft.entryKind === 'products' && Boolean(draft.builderLineIds));

    const ready: Record<SectionKey, boolean> = useMemo(
        () => ({
            products: lines.length > 0 && isItemsReady(draft, lines),
            details:
                (flow === 'general'
                    ? Boolean(GENERAL_REQUEST_FLOW.screens.find((s) => s.key === 'details')?.ready(ctx))
                    : // Owner: describe/files optional on product (Items carry the quote); services still gate.
                      !draft.servicesEnabled || isServicesStepReady(draft)) &&
                isShippingReady(draft),
            contact: isIntakeContactReady(draft),
            submit: true,
        }),
        [draft, lines, flow, viewer],
    );
    // First unfinished content section — used only for land / invalid held clamp.
    const firstOpen = sections.find((k) => !ready[k]);
    if (ok && landedStep.current === null) {
        // Owner: bare /request/products always opens Items (saved answers = prefill, not a skip).
        landedStep.current = flow === 'product' ? 'products' : (firstOpen ?? sections[sections.length - 1]!);
    }
    const wanted = heldStep ?? landedStep.current;
    const wantedOk =
        wanted !== null &&
        sections.includes(wanted) &&
        sections.slice(0, sections.indexOf(wanted)).every((k) => ready[k]);
    const open: SectionKey = wantedOk ? wanted! : (firstOpen ?? sections[sections.length - 1]!);

    // R33: the brief opened now (for the 3-second check on submit).
    useEffect(() => {
        if (!ok) return;
        try {
            const k = `pf_brief_opened:${draft.id}`;
            if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, String(Date.now()));
        } catch {
            /* storage blocked */
        }
    }, [ok, draft.id]);

    useEffect(() => {
        if (!ok) return;
        if (!opened.current.has(open)) {
            opened.current.add(open);
            trackSectionOpen(flow, leadId, open);
        }
        if (!scrollOnNextOpen.current) return;
        scrollOnNextOpen.current = false;
        // Proto A: wait two frames so SectionBody height tweens have started, then follow the header
        // for the fold duration (+ slack for the open-body rAF start).
        let stop: (() => void) | undefined;
        let raf2 = 0;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => {
                stop = anchorHeaderToWorkBand(`section-${open}-header`, SECTION_FOLD_MS + 40);
            });
        });
        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
            stop?.();
        };
    }, [ok, open, flow, leadId]);

    if (!ok) return null;

    const go = (step: SectionKey) => {
        scrollOnNextOpen.current = true;
        setHeldStep(step);
    };
    // Owner Nov 6: Continue always opens the next section in order (even one already filled, e.g. a
    // signed-in buyer's Contact), so nothing counts as done before the buyer has reached it.
    const onContinue = (k: SectionKey) => {
        trackSectionDone(flow, leadId, k);
        const next = sections[sections.indexOf(k) + 1];
        if (next) go(next);
    };
    // Owner Nov 6: all sections show (a hidden-steps trial was tried and reverted); upcoming ones are grey.
    const openIdx = sections.indexOf(open);
    const canSubmit = sections.every((k) => ready[k]);
    // Product: leave keeps the draft (decision 4). General: ephemeral — discard on Close.
    const saveAndExit = () => {
        leaving.current = true;
        if (flow === 'general') {
            releaseGeneralSession();
            discardDraft();
        }
        leaveToolShell(router);
    };

    function onSubmitted(ref: string) {
        leaving.current = true;
        if (lines.length) {
            try {
                sessionStorage.setItem(`pf_submitted_lines:${draft.id}`, JSON.stringify(lines));
            } catch {
                /* storage blocked: the paper shows without products */
            }
        }
        updateDraft({ref, submittedAt: new Date().toISOString()});
        consumeSubmittedLines();
        trackFunnel('rfq_submitted', {flow, lead_id: draft.id, ref, from: entryFrom(), layout: 'sections'});
        // v0.3: the confirmation has its own address (a refresh of /request would start a new request).
        router.push(submittedHref(flow, ref));
    }

    const summary: Partial<Record<SectionKey, ReactNode>> = {
        products: <ProductsSummary lines={lines} />,
        details:
            flow === 'general' ? (
                <GeneralDetailsSummary draft={draft} />
            ) : (
                <ProductDetailsSummary draft={draft} />
            ),
        contact: [`${draft.contactFirstName} ${draft.contactLastName}`.trim(), draft.contactEmail].filter(Boolean).join(' · '),
    };
    const state = (k: SectionKey): SectionState =>
        open === k ? 'open' : ready[k] && sections.indexOf(k) < openIdx ? 'done' : 'todo';

    // Owner Nov 6: the request's own top bar (Logo | Quote Request … Sign in | Close) and a page
    // heading like the site's pages; Close keeps the request (decision 4).
    return (
        <RequestShell onClose={saveAndExit}>
            {/* SectionReveal: heading + steps settle after shell modal enter (once per path). Dieline stays outside. */}
            <SectionReveal className="flex flex-1 flex-col">
                {/* Owner Nov 6: centred heading, and the steps in one centred column (max-w-5xl, 1024px) so it reads as one form. */}
                <PageHeadingSection
                    align="center"
                    title={flow === 'product' ? 'Quote Request' : 'Get a Quote'}
                    description={
                        flow === 'product'
                            ? 'Choose what you want quoted, tell us about your project, and we’ll get back to you.'
                            : 'Tell us about your project and how to reach you.'
                    }
                />
                {/* flush: section dividers run to the page's dashed guides; each section centres its own 1024px (max-w-5xl) column.
                    flex-1 stretches the bordered column so vertical guides fill leftover viewport; borderBottom closes the frame. */}
                <PageDielineSection
                    paddingBlock="none"
                    flush
                    borderBottom
                    className="flex flex-1 flex-col"
                    innerClassName="flex min-h-full flex-1 flex-col"
                >
                    <div className="flex w-full flex-col">
                        {sections.map((k, i) => (
                            <SectionShell
                                key={k}
                                id={k}
                                index={i + 1}
                                title={SECTION_TITLE[k]}
                                state={state(k)}
                                summary={summary[k]}
                                {...(k === 'products' ? {meta: `${lines.length} of ${pool.length} selected`} : {})}
                                onEdit={() => go(k)}
                                // Continue on the next section row; Contact is last — Submit is its action.
                                {...(sections.indexOf(k) === openIdx + 1
                                    ? {
                                          cta: {
                                              onClick: () => onContinue(open),
                                              disabled: !ready[open],
                                              reason: blockedReason(open, flow, draft, lines, ctx.rules),
                                          },
                                      }
                                    : {})}
                            >
                                {k === 'products' ? <ProductsSection /> : null}
                                {k === 'details' ? (
                                    <>
                                        <ProjectDetailsScreen flow={flow} draft={draft} onPatch={updateDraft} serviceOptions={serviceOptions} columns />
                                        {flow === 'product' ? <ServicesAddCard draft={draft} onPatch={updateDraft} serviceOptions={serviceOptions} /> : null}
                                    </>
                                ) : null}
                                {k === 'contact' ? (
                                    <>
                                        <IntakeContactScreen draft={draft} onPatch={updateDraft} showReplyNote={false} />
                                        <RequestSectionsSubmit
                                            flow={flow}
                                            lines={lines}
                                            draft={draft}
                                            onPatch={updateDraft}
                                            serviceOptions={serviceOptions}
                                            onSubmitted={onSubmitted}
                                            canSubmit={canSubmit}
                                        />
                                    </>
                                ) : null}
                            </SectionShell>
                        ))}
                        {/* Scroll room so any open step (not only Contact) can dock under the top bar. */}
                        <div className="h-[min(40dvh,22rem)] shrink-0" aria-hidden />
                    </div>
                </PageDielineSection>
            </SectionReveal>
        </RequestShell>
    );
}

/** Folded Project summary for general: labeled Quantity + Project brief + ship-to. */
function GeneralDetailsSummary({draft}: {draft: RequestDraft}) {
    const need = REQUEST_COPY.intakeNeedChoices
        .filter((o) => draftNeeds(draft).includes(o.value))
        .map((o) => o.label)
        .join(' + ');
    const qty = draft.expressQuantities.filter((n) => n > 0).map((n) => n.toLocaleString('en-US')).join(', ');
    const brief = draft.notes.trim();
    const fileCount = draft.referenceImages?.length ?? 0;
    const briefValue =
        brief || (fileCount > 0 ? `${fileCount} file${fileCount === 1 ? '' : 's'}` : '—');
    const shipTo = draft.shippingAddress
        ? formatAddressSummaryLine(draft.shippingAddress)
        : '';
    return (
        <div className="flex flex-col gap-2 text-sm">
            {need ? <p className="text-muted-foreground">{need}</p> : null}
            <p>
                <span className="text-muted-foreground">Quantity: </span>
                <span className="text-foreground">{qty || '—'}</span>
            </p>
            <p>
                <span className="text-muted-foreground">Project brief: </span>
                <span className="whitespace-pre-line text-foreground">{briefValue}</span>
            </p>
            {shipTo ? (
                <p>
                    <span className="text-muted-foreground">{REQUEST_COPY.shipToLabel}: </span>
                    <span className="text-foreground">{shipTo}</span>
                </p>
            ) : null}
        </div>
    );
}

/** Folded Project summary for product: brief + ship-to. */
function ProductDetailsSummary({draft}: {draft: RequestDraft}) {
    const brief = draft.notes.trim();
    const fileCount = draft.referenceImages?.length ?? 0;
    const briefValue =
        brief || (fileCount > 0 ? `${fileCount} file${fileCount === 1 ? '' : 's'}` : null);
    const shipTo = draft.shippingAddress
        ? formatAddressSummaryLine(draft.shippingAddress)
        : '';
    if (!briefValue && !shipTo) return null;
    return (
        <div className="flex flex-col gap-2 text-sm">
            {briefValue ? (
                <p>
                    <span className="text-muted-foreground">Project brief: </span>
                    <span className="whitespace-pre-line text-foreground">{briefValue}</span>
                </p>
            ) : null}
            {shipTo ? (
                <p>
                    <span className="text-muted-foreground">{REQUEST_COPY.shipToLabel}: </span>
                    <span className="text-foreground">{shipTo}</span>
                </p>
            ) : null}
        </div>
    );
}

/** Folded Items step: one row per selected product — thumbnail, title, quantities. */
function ProductsSummary({lines}: {lines: RequestLine[]}) {
    return (
        <ul className="flex flex-col gap-4">
            {lines.map((line) => {
                const title = line.productTitle ?? line.productSlug;
                const qty = line.quantities
                    .filter((n) => n > 0)
                    .map((n) => n.toLocaleString('en-US'))
                    .join(', ');
                const src = line.productMedia?.[0]?.src;
                return (
                    <li key={line.id} className="flex items-start gap-4">
                        <span className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                            {src ? (
                                // Caller supplies the catalog image URL.
                                <img src={src} alt="" className="size-full object-contain" />
                            ) : null}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="truncate text-foreground">{title}</span>
                            {qty ? <span>{qty}</span> : null}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}
