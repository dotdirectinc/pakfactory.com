'use client';

import {useEffect, useMemo, useRef, type ReactNode} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {SectionReveal} from '@/components/common/section-reveal';
import {RequestShell} from '@/components/request-v2/request-shell';
import {IntakeContactScreen} from '@/components/intake/screens/intake-contact-screen';
import {IntakeReview} from '@/components/intake/screens/intake-review';
import {ProjectDetailsScreen} from '@/components/intake/screens/project-details-screen';
import {ProductsSection} from '@/components/request-v2/sections/products-section';
import {ServicesAddCard} from '@/components/request-v2/sections/services-add-card';
import {SectionShell, type SectionState} from '@/components/request-v2/section-shell';
import {GENERAL_REQUEST_FLOW} from '@/lib/intake/flows/general';
import {isServicesStepReady} from '@/lib/intake/flows/services-ready';
import {draftNeeds} from '@/lib/intake/needs';
import type {IntakeContext} from '@/lib/intake/types';
import {REQUEST_COPY} from '@/lib/copy/request';
import {entryFrom, trackFunnel} from '@/lib/request/funnel';
import {useRequest} from '@/lib/request/request-provider';
import type {RequestLine} from '@/lib/request/request.storage';
import type {RequestServiceOption} from '@/lib/request/service-option';
import {isIntakeContactReady, isItemsReady} from '@/lib/request/validation';
import {WWW_ROUTES} from '@/lib/www-routes';
import {REQUEST_SECTIONS, SECTION_TITLE, type SectionKey} from '@/lib/request-v2/flow';
import {trackSectionDone, trackSectionOpen} from '@/lib/request-v2/events';
import {requestHref, stepFromParam, submittedHref} from '@/lib/request-v2/url';
import {blockedReason} from '@/lib/request-v2/blocked';

/**
 * RFQ v2 request page (vault prd-website-rfq-v2 §2, URLs §5): `/request`, one page in the focused shell, filled
 * section by section — Products (product request) → Project details → Contact → Submit.
 * Each finished section collapses to a summary with Edit; no Review step. Everything
 * autosaves (the draft store); Save & exit keeps the request. PORTABLE: rules come in as a prop.
 */
export function RequestPageV2({
    serviceOptions = [],
    rules = {},
}: {
    serviceOptions?: RequestServiceOption[];
    rules?: IntakeContext['rules'];
}) {
    const router = useRouter();
    const params = useSearchParams();
    const {draft, viewer, lines: pool, builderLines, updateDraft, discardDraft, consumeSubmittedLines} = useRequest();
    const leaving = useRef(false);
    const opened = useRef(new Set<string>());
    // v0.4: the kind is in the path (/request/products, /request/general); the page shows the saved request of that kind.
    const flow = draft.express ? 'general' : 'product';
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
                flow === 'general'
                    ? Boolean(GENERAL_REQUEST_FLOW.screens.find((s) => s.key === 'details')?.ready(ctx))
                    : // Owner: describe/files optional on product (Items carry the quote); services still gate.
                      !draft.servicesEnabled || isServicesStepReady(draft),
            contact: isIntakeContactReady(draft),
        }),
        [draft, lines, flow, viewer],
    );
    const firstOpen = sections.find((k) => !ready[k]);
    const allDone = !firstOpen;
    const rawStep = params.get('step');
    const asked = stepFromParam(rawStep);
    // A section opens only when every section above it is done.
    const askedOk = asked !== null && asked !== 'submit' && sections.includes(asked) && sections.slice(0, sections.indexOf(asked)).every((k) => ready[k]);
    // Owner: bare /request/products always opens Items (saved answers = prefill, not a skip).
    // Explicit ?step= / Continue / Edit keep the askedOk path. General still uses first unfinished.
    const open: SectionKey | 'submit' = askedOk
        ? (asked as SectionKey)
        : asked === 'submit' && allDone
          ? 'submit'
          : flow === 'product' && rawStep === null
            ? 'products'
            : (firstOpen ?? 'submit');

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
        if (!ok || open === 'submit') return;
        if (!opened.current.has(open)) {
            opened.current.add(open);
            trackSectionOpen(flow, leadId, open);
        }
        // Owner Nov 6: glide so the new step's heading sits just under the top bar (not on first load).
        if (opened.current.size === 1 && !params.get('step')) return;
        const el = document.getElementById(`section-${open}`);
        if (!el) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        // After the step above has folded, so the target position is final (no overshoot).
        const t = setTimeout(() => {
            const top = el.getBoundingClientRect().top + window.scrollY - 88;
            window.scrollTo({top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth'});
        }, reduce ? 0 : 320);
        return () => clearTimeout(t);
    }, [ok, open, flow, leadId]);

    if (!ok) return null;

    const go = (step: SectionKey | 'submit') => router.replace(requestHref(flow, step), {scroll: false});
    // Owner Nov 6: Continue always opens the next section in order (even one already filled, e.g. a
    // signed-in buyer's Contact), so nothing counts as done before the buyer has reached it.
    const onContinue = (k: SectionKey) => {
        trackSectionDone(flow, leadId, k);
        go(sections[sections.indexOf(k) + 1] ?? 'submit');
    };
    // Owner Nov 6: all sections show (a hidden-steps trial was tried and reverted); upcoming ones are grey.
    const openIdx = open === 'submit' ? sections.length : sections.indexOf(open);
    const visible = sections;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const progress = (k: SectionKey) => {
        const i = sections.indexOf(k);
        const next = sections[i + 1];
        return `Step ${i + 1} of ${sections.length} · Next: ${next ? SECTION_TITLE[next] : 'Submit'}`;
    };
    // Product: leave keeps the draft (decision 4). General: ephemeral — discard on Close.
    const saveAndExit = () => {
        leaving.current = true;
        if (flow === 'general') discardDraft();
        router.push(WWW_ROUTES.home);
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

    const summary: Record<SectionKey, ReactNode> = {
        products: <ProductsSummary lines={lines} />,
        details: [
            flow === 'general' ? REQUEST_COPY.intakeNeedChoices.filter((o) => draftNeeds(draft).includes(o.value)).map((o) => o.label).join(' + ') : '',
            draft.notes.trim(),
        ]
            .filter(Boolean)
            .join(' · '),
        contact: [`${draft.contactFirstName} ${draft.contactLastName}`.trim(), draft.contactEmail].filter(Boolean).join(' · '),
    };
    const lastSection = sections[sections.length - 1];
    // When everything is ready, open becomes "submit" — keep Contact open so Submit stays in that section.
    const state = (k: SectionKey): SectionState =>
        open === k || (open === 'submit' && k === lastSection)
            ? 'open'
            : ready[k] && sections.indexOf(k) < openIdx
              ? 'done'
              : 'todo';

    const showSubmit = allDone && (open === 'submit' || open === lastSection);
    const submitFooter = showSubmit ? (
        <IntakeReview
            flow={flow}
            lines={lines}
            draft={draft}
            onPatch={updateDraft}
            serviceOptions={serviceOptions}
            sections={[]}
            onSubmitted={onSubmitted}
            shell="sections"
            stickyBar
        />
    ) : null;

    // Owner Nov 6: the request's own top bar (Logo | Quote Request … Sign in | Close) and a page
    // heading like the site's pages; Close keeps the request (decision 4).
    return (
        <RequestShell onClose={saveAndExit}>
            {/* Owner Nov 6: centred heading, and the steps in one centred column (max-w-5xl, 1024px) so it reads as one form. */}
            <PageHeadingSection
                align="center"
                settle
                title={flow === 'product' ? 'Quote Request' : 'Get a Quote'}
                description={
                    flow === 'product'
                        ? 'Choose what you want quoted, tell us about your project, and we’ll get back to you.'
                        : 'Tell us about your project and how to reach you.'
                }
            />
            {/* flush: section dividers run to the page's dashed guides; each section centres its own 1024px (max-w-5xl) column. */}
            <PageDielineSection paddingBlock="none" flush innerClassName="pb-16 sm:pb-20 lg:pb-24">
                <SectionReveal className="flex w-full flex-col">
                    {visible.map((k, i) => (
                        <SectionShell
                            key={k}
                            id={k}
                            index={i + 1}
                            title={SECTION_TITLE[k]}
                            state={state(k)}
                            summary={summary[k]}
                            // Owner Nov 6: no "Step 1 of 3 · Next: …" line for now (progress() kept for a later trial).
                            {...(k === 'products' ? {meta: `${lines.length} of ${pool.length} selected`} : {})}
                            onEdit={() => go(k)}
                            {...(open !== 'submit' && sections.indexOf(k) === openIdx + 1
                                ? {cta: {onClick: () => onContinue(open), disabled: !ready[open], reason: blockedReason(open, flow, draft, lines, ctx.rules)}}
                                : {})}
                            {...(k === lastSection && submitFooter ? {footer: submitFooter} : {})}
                        >
                            {k === 'products' ? <ProductsSection /> : null}
                            {k === 'details' ? (
                                <>
                                    <ProjectDetailsScreen flow={flow} draft={draft} onPatch={updateDraft} serviceOptions={serviceOptions} showShipTo={false} columns />
                                    {flow === 'product' ? <ServicesAddCard draft={draft} onPatch={updateDraft} serviceOptions={serviceOptions} /> : null}
                                </>
                            ) : null}
                            {k === 'contact' ? <IntakeContactScreen draft={draft} onPatch={updateDraft} showReplyNote={false} /> : null}
                        </SectionShell>
                    ))}
                    {/* Last step not complete: say what's missing where Submit will appear. */}
                    {open === lastSection && !allDone ? (
                        <p className="mx-auto w-full max-w-5xl px-layout-gutter-inner pt-2 text-right text-sm text-muted-foreground" aria-live="polite">
                            {blockedReason(open, flow, draft, lines, ctx.rules) ?? 'Finish the steps above to submit'}
                        </p>
                    ) : null}
                </SectionReveal>
            </PageDielineSection>
        </RequestShell>
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
