'use client';

import {draftNeeds} from '@/lib/intake/needs';
import {useEffect, useRef, useState, useTransition, type ReactNode} from 'react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {HoneypotField, MarketingOptIn, PrivacyLine} from '@/components/request/review-consent';
import {REQUEST_COPY} from '@/lib/copy/request';
import {formatAnnualSpendDisplay, resolveAnnualSpendCurrency} from '@/lib/request/annual-spend';
import {trackFunnel} from '@/lib/request/funnel';
import type {RequestFlow} from '@/lib/intake/routes';
import type {RequestDraft, RequestLine} from '@/lib/request/request.storage';
import {resolveServiceLabel, serviceTitlesForIds} from '@/lib/request/service-label';
import type {RequestServiceOption} from '@/lib/request/service-option';
import {needsPackaging, needsService} from '@/lib/request/validation';
import {submitRequest} from '@/lib/rfq/submit-request';
import {REQUEST_FORM_RULES} from '@/lib/request/request-rules';

type Row = {question: string; answer: ReactNode};

type SectionKey = 'type' | 'products' | 'services' | 'details' | 'contact';

type IntakeReviewProps = {
    flow: RequestFlow;
    /** The products (product request); empty elsewhere. */
    lines: RequestLine[];
    draft: RequestDraft;
    onPatch: (patch: Partial<RequestDraft>) => void;
    serviceOptions: RequestServiceOption[];
    /** Sections on the buyer's path (Contact is skipped for signed-in buyers). */
    sections: {key: SectionKey; title: string}[];
    onSubmitted: (ref: string) => void;
    shell: string | null;
    /** Sticky quick-submit when the in-page CTA is off-screen (default on). */
    stickyBar?: boolean;
};

/**
 * Review on the step intake (owner Nov 2): "check your answers" — one section per step, each
 * question with the buyer's answer (no Change links). No paper here (the paper
 * is on the thank-you page, with the real reference) and no Back button. A sticky submit bar
 * shows until the bottom CTA is on screen.
 *
 * Sectioned request Submit lives in `RequestSectionsSubmit` under open Contact.
 */
export function IntakeReview({
    flow,
    lines,
    draft,
    onPatch,
    serviceOptions,
    sections,
    onSubmitted,
    shell,
    stickyBar = true,
}: IntakeReviewProps) {
    const [error, setError] = useState('');
    const [pending, startTransition] = useTransition();
    const [honeypot, setHoneypot] = useState('');
    // R33: the 3-second check counts from opening the brief (the intake's first screen), not from
    // this Review screen — a quick click on Review is a person, not a bot (fix Nov 6).
    const openedAt = useRef(briefOpenedAt(draft.id));
    const rules = REQUEST_FORM_RULES;

    // Sticky submit bar (owner Nov 2, R35): lets a buyer submit without scrolling the whole
    // review; it steps aside once the bottom CTA is on screen. Spans the right panel (<main>).
    const rootRef = useRef<HTMLDivElement>(null);
    const ctaRef = useRef<HTMLDivElement>(null);
    // Assume the in-page CTA is on screen until measured — otherwise the sticky flashes as soon as
    // the request becomes complete (ctaInView started false).
    const [ctaInView, setCtaInView] = useState(true);
    const [box, setBox] = useState<{left: number; width: number} | null>(null);
    useEffect(() => {
        const cta = ctaRef.current;
        const root = rootRef.current;
        if (!cta || !root) return;
        const io = new IntersectionObserver(([e]) => setCtaInView(Boolean(e?.isIntersecting)), {threshold: 0.25});
        io.observe(cta);
        const panel = root.closest('main') ?? root;
        const measure = () => {
            const p = panel.getBoundingClientRect();
            setBox({left: p.left, width: p.width});
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(root);
        ro.observe(panel);
        window.addEventListener('resize', measure);
        return () => {
            io.disconnect();
            ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, []);
    const barShown = stickyBar && !ctaInView && box !== null;
    useEffect(() => {
        const rootEl = document.documentElement;
        if (barShown) rootEl.style.setProperty('--chat-fab-offset', '104px');
        else rootEl.style.removeProperty('--chat-fab-offset');
        return () => {
            rootEl.style.removeProperty('--chat-fab-offset');
        };
    }, [barShown]);

    // R36 list (owner Nov 3): each ticked option's label, in the order shown on the screen.
    const typeLabel = REQUEST_COPY.intakeNeedChoices.filter((o) => draftNeeds(draft).includes(o.value)).map((o) => o.label).join(' · ') || '—';
    const files = (draft.referenceImages ?? []).filter((f) => f.key || f.status === 'uploaded').map((f) => f.name);
    const spend = formatAnnualSpendDisplay(
        draft.annualSpend,
        resolveAnnualSpendCurrency(draft.annualSpend, draft.annualSpendCurrency),
    );

    const serviceAnswer = draft.services.map((id) => resolveServiceLabel(id, serviceOptions, draft.serviceOther)).join(' · ');
    const rows: Record<SectionKey, Row[]> = {
        type: [{question: REQUEST_COPY.intakeNeedReviewLabel, answer: typeLabel}],
        products: [
            ...lines.map((line) => ({
                question: line.productTitle ?? line.productSlug,
                answer: line.quantities.filter((n) => n > 0).map((n) => n.toLocaleString('en-US')).join(' · '),
            })),
            // c100: a product request picks its services on the Products screen.
            ...(flow === 'product' && draft.servicesEnabled && draft.services.length
                ? [{question: REQUEST_COPY.intakeReviewServices, answer: serviceAnswer}]
                : []),
        ],
        services: [{question: REQUEST_COPY.intakeReviewServices, answer: serviceAnswer}],
        details: [
            // v4.7 (R36): What you need is asked on Project details, so it's reviewed there.
            ...(flow === 'general' ? [{question: REQUEST_COPY.intakeNeedReviewLabel, answer: typeLabel}] : []),
            ...(flow === 'product' ? [{question: REQUEST_COPY.shipToLabel, answer: formatShipTo(draft)}] : []),
            // Same order as the screen (owner Nov 2): description and files, services, specifics.
            ...(draft.notes.trim()
                ? [
                      {
                          question:
                              flow === 'product'
                                  ? REQUEST_COPY.intakeDescribeByFlow.product.label
                                  : REQUEST_COPY.intakeReviewDescription,
                          answer: <span className="whitespace-pre-line">{draft.notes.trim()}</span>,
                      },
                  ]
                : []),
            ...(files.length ? [{question: REQUEST_COPY.intakeReviewFiles, answer: files.join(', ')}] : []),
            ...(flow === 'general' && needsService(draft)
                ? [{question: REQUEST_COPY.intakeReviewServices, answer: draft.services.map((id) => resolveServiceLabel(id, serviceOptions, draft.serviceOther)).join(' · ')}]
                : []),
            ...(flow === 'general' && needsPackaging(draft)
                ? [
                      {question: REQUEST_COPY.quantityLabel, answer: draft.expressQuantities.map((n) => n.toLocaleString('en-US')).join(' · ')},
                      // v4.7: not asked this phase; shown only if something filled it (e.g. AI prefill).
                      ...(draft.packagingContents.trim() ? [{question: REQUEST_COPY.contentsLabel, answer: draft.packagingContents}] : []),
                  ]
                : []),
        ],
        contact: [
            {question: REQUEST_COPY.intakeReviewName, answer: `${draft.contactFirstName} ${draft.contactLastName}`.trim()},
            {question: REQUEST_COPY.workEmail, answer: draft.contactEmail},
            ...(draft.contactPhone.trim() ? [{question: REQUEST_COPY.phone, answer: draft.contactPhone.trim()}] : []),
            ...(draft.contactWebsite ? [{question: REQUEST_COPY.intakeWebsiteLabel, answer: draft.contactWebsite}] : []),
            ...(spend ? [{question: REQUEST_COPY.intakeReviewSpend, answer: spend}] : []),
        ],
    };

    // Product request with the "Add services" switch off: services picked earlier are kept, not sent.
    const sendDraft = flow === 'product' && !draft.servicesEnabled ? {...draft, services: []} : draft;

    function submit() {
        setError('');
        trackFunnel('rfq_submit_click', {entry_kind: draft.entryKind, shell});
        startTransition(async () => {
            try {
                const result = await submitRequest({
                    draft: sendDraft,
                    lines,
                    rules,
                    botCheck: {honeypot, elapsedMs: Date.now() - openedAt.current},
                    serviceTitles: serviceTitlesForIds(sendDraft.services, serviceOptions, draft.serviceOther),
                });
                if (!result.ok) {
                    setError(result.error);
                    return;
                }
                onSubmitted(result.ref);
            } catch {
                setError(REQUEST_COPY.submitTransportError);
            }
        });
    }

    return (
        <div ref={rootRef} className="flex flex-col gap-10 pb-8">
            <HoneypotField value={honeypot} onChange={setHoneypot} />
            {sections.map((section) => (
                <section key={section.key} className="flex flex-col gap-3">
                    {/* No Change links (owner Nov 2): nothing to slow the submit; the step list and Back still reach every step. */}
                    <div className="border-b border-border pb-2">
                        <h2 className="text-lg font-medium tracking-tight text-foreground">{section.title}</h2>
                    </div>
                    <dl className="flex flex-col">
                        {rows[section.key].map((row) => (
                            <div key={row.question} className="grid gap-1 border-b border-border/60 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6">
                                <dt className="text-sm text-muted-foreground">{row.question}</dt>
                                <dd className="text-sm text-foreground">{row.answer || '—'}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
            ))}

            <div ref={ctaRef} className="flex flex-col gap-3">
                <MarketingOptIn compact optIn={Boolean(draft.marketingOptIn)} onOptInChange={(v) => onPatch({marketingOptIn: v})} />
                {error ? (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                ) : null}
                <Button type="button" size="xl" className="w-full" disabled={pending} onClick={submit}>
                    {pending ? REQUEST_COPY.submitting : REQUEST_COPY.requestAQuote}
                </Button>
                <PrivacyLine className="pl-6" />
            </div>

            {stickyBar ? (
                <div
                    aria-hidden={!barShown}
                    style={box ? {left: box.left, width: box.width} : undefined}
                    className={cn(
                        'fixed bottom-0 z-40 border-t border-border bg-background/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur transition-[transform,opacity] duration-300 supports-[backdrop-filter]:bg-background/85',
                        barShown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0',
                    )}
                >
                    <div className="flex items-center gap-6 px-6 pt-3 sm:px-10">
                        <div className="hidden min-w-0 flex-1 flex-col gap-1.5 sm:flex">
                            <MarketingOptIn
                                compact
                                idSuffix="-bar"
                                optIn={Boolean(draft.marketingOptIn)}
                                onOptInChange={(v) => onPatch({marketingOptIn: v})}
                            />
                            <PrivacyLine className="pl-6" />
                        </div>
                        <Button
                            type="button"
                            size="xl"
                            className="w-full sm:w-auto sm:min-w-[280px]"
                            disabled={pending}
                            tabIndex={barShown ? 0 : -1}
                            onClick={submit}
                        >
                            {pending ? REQUEST_COPY.submitting : REQUEST_COPY.requestAQuote}
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

/** One line for the ship-to address (city, region, country — whatever was given). */
function formatShipTo(draft: RequestDraft): string {
    const a = draft.shippingAddress;
    if (!a) return '';
    return [a.line1, a.city, a.region, a.postalCode, a.country].map((p) => p?.trim()).filter(Boolean).join(', ');
}

/** When this request's brief was opened (set by the intake on its first screen); now if unknown. */
function briefOpenedAt(draftId: string): number {
    try {
        const v = Number(sessionStorage.getItem(`pf_brief_opened:${draftId}`));
        return v > 0 ? v : Date.now();
    } catch {
        return Date.now();
    }
}
