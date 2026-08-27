'use client';

import {useEffect, useRef, useState, useTransition} from 'react';
import {ChevronUp} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@pakfactory/ui/components/sheet';
import {cn} from '@pakfactory/ui/lib/utils';
import {getProduct} from '@/lib/catalog/catalog';
import {REQUEST_COPY} from '@/lib/copy/request';
import {formatSpendLabel} from '@/lib/request/annual-spend';
import type {RequestDraft, RequestLine} from '@/lib/request/request.storage';
import {formatAddressLines} from '@/lib/request/shipping-address';
import {
    canSubmitRequest,
    isExpressRequirementsOnly,
} from '@/lib/request/validation';
import {submitRequest} from '@/lib/rfq/submit-request';

type StepReviewProps = {
    draft: RequestDraft;
    lines: RequestLine[];
    submitHelper: string;
    onSubmitted: (ref: string) => void;
    onEditSection: (key: string) => void;
    sectionRef?: React.Ref<HTMLElement>;
};

type SummaryBodyProps = {
    draft: RequestDraft;
    lines: RequestLine[];
    toName: string;
    shippingLines: string[];
    officeLines: string[];
    spendDisplay: string;
    briefText: string;
    onEditSection: (key: string) => void;
    compact?: boolean;
};

function PaperEditLink({onClick}: {onClick: () => void}) {
    return (
        <Button
            type="button"
            variant="link"
            onClick={onClick}
            className="h-auto p-0 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
            {REQUEST_COPY.paperEdit}
        </Button>
    );
}

function productsStatusLabel(count: number): string {
    if (count === 0) return REQUEST_COPY.noProductsCount;
    if (count === 1) return REQUEST_COPY.productsCountOne;
    return REQUEST_COPY.productsCountMany.replace('{n}', String(count));
}

function ReviewLetterhead({
    displayRef,
    today,
}: {
    displayRef: string;
    today: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-dashed border-[#E9E9E7] pb-4">
            <div className="flex items-center gap-2.5">
                <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background"
                    aria-hidden
                >
                    PF
                </div>
                <div className="leading-tight">
                    <p className="text-[15px] font-semibold tracking-tight">
                        {REQUEST_COPY.letterheadName}
                    </p>
                    <p className="text-[12.5px] text-muted-foreground">
                        {REQUEST_COPY.letterheadTagline}
                    </p>
                </div>
            </div>
            <div className="text-right leading-tight">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
                    {REQUEST_COPY.reviewPaperBadge}
                </p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                    {today}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground/70">
                    {REQUEST_COPY.refLabel} {displayRef}
                </p>
            </div>
        </div>
    );
}

function ReviewSummaryBody({
    draft,
    lines,
    toName,
    shippingLines,
    officeLines,
    spendDisplay,
    briefText,
    onEditSection,
    compact = false,
}: SummaryBodyProps) {
    return (
        <>
            <div
                className={cn(
                    'grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2',
                    compact ? 'mt-0' : 'mt-5',
                )}
            >
                <div>
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                            {REQUEST_COPY.preparedFor}
                        </p>
                        <PaperEditLink
                            onClick={() => onEditSection('information')}
                        />
                    </div>
                    <p className="mt-1 text-[13px] font-medium">{toName}</p>
                    {draft.contactCompany ? (
                        <p className="text-[13px] text-muted-foreground">
                            {draft.contactCompany}
                        </p>
                    ) : null}
                    <p className="text-[13px] text-muted-foreground">
                        {draft.contactEmail || '—'}
                    </p>
                    {draft.contactPhone ? (
                        <p className="text-[13px] text-muted-foreground">
                            {draft.contactPhone}
                        </p>
                    ) : null}
                    {officeLines.length ? (
                        <p className="text-[13px] text-muted-foreground">
                            {officeLines.join(' · ')}
                        </p>
                    ) : null}
                </div>
                <div>
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                            {REQUEST_COPY.shippedToAddress}
                        </p>
                        <PaperEditLink
                            onClick={() => onEditSection('requirements')}
                        />
                    </div>
                    {shippingLines.length ? (
                        shippingLines.map((line, i) => (
                            <p
                                key={`${line}-${i}`}
                                className="text-[13px] text-muted-foreground first:mt-1"
                            >
                                {line}
                            </p>
                        ))
                    ) : (
                        <p className="mt-1 text-[13px] text-muted-foreground">
                            {REQUEST_COPY.regionToConfirm}
                        </p>
                    )}
                    {spendDisplay ? (
                        <p className="mt-2 text-[13px] text-muted-foreground">
                            {REQUEST_COPY.budgetOnPaper} {spendDisplay}
                        </p>
                    ) : null}
                    {draft.contactIndustry ? (
                        <p className="text-[13px] text-muted-foreground">
                            {draft.contactIndustry}
                        </p>
                    ) : null}
                </div>
            </div>
            <div
                className="mt-5 border-b border-dashed border-[#E9E9E7]"
                aria-hidden
            />

            {lines.length === 0 ? (
                <p className="mt-5 text-[13px] text-muted-foreground">
                    {REQUEST_COPY.noProductsAdded}
                </p>
            ) : (
                <table className="mt-5 w-full border-collapse text-left text-[13px]">
                    <thead>
                        <tr className="border-b border-dashed border-[#E9E9E7]">
                            <th className="w-24 pb-2 align-bottom text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                                {REQUEST_COPY.paperQty}
                            </th>
                            <th className="pb-2 align-bottom text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                                {REQUEST_COPY.paperItem}
                            </th>
                            <th className="pb-2 align-bottom text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                                {REQUEST_COPY.paperConfiguration}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line) => {
                            const product = getProduct(line.productSlug);
                            const title =
                                product?.title ?? line.productSlug;
                            const qty = line.quantities
                                .map((n) => n.toLocaleString('en-US'))
                                .join(', ');
                            const config =
                                [
                                    line.contents,
                                    ...line.customizations.map((c) => c.label),
                                    line.notes,
                                ]
                                    .filter(Boolean)
                                    .join(' · ') ||
                                REQUEST_COPY.specialistToAdvise;
                            return (
                                <tr
                                    key={line.id}
                                    className="border-b border-dashed border-[#E9E9E7] align-top last:border-b-0"
                                >
                                    <td className="py-3 pr-3 font-medium">
                                        {qty}
                                    </td>
                                    <td className="py-3 pr-3 font-medium">
                                        {title}
                                    </td>
                                    <td className="py-3 text-muted-foreground">
                                        {config}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            <div className="mt-5 border-t border-dashed border-[#E9E9E7] pt-4">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                        {REQUEST_COPY.paperBrief}
                    </p>
                    <PaperEditLink
                        onClick={() => onEditSection('requirements')}
                    />
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-[13px]">
                    {briefText || REQUEST_COPY.notSet}
                </p>
                {draft.timeline.trim() ? (
                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                        {REQUEST_COPY.timeFramePrefix} {draft.timeline.trim()}
                    </p>
                ) : null}
                {draft.packagingContents ? (
                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                        {REQUEST_COPY.packagingPrefix}{' '}
                        {draft.packagingContents}
                    </p>
                ) : null}
                {isExpressRequirementsOnly(draft) &&
                draft.expressQuantities.length > 0 ? (
                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                        {REQUEST_COPY.quantityPrefix}{' '}
                        {draft.expressQuantities
                            .map((n) => n.toLocaleString('en-US'))
                            .join(', ')}{' '}
                        {REQUEST_COPY.unitsSuffix}
                    </p>
                ) : null}
            </div>

            <p
                className={cn(
                    'rounded-md bg-muted/50 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground',
                    compact ? 'mt-6' : 'mt-auto',
                )}
            >
                {REQUEST_COPY.paperDisclaimer}
            </p>
        </>
    );
}

export function StepReview({
    draft,
    lines,
    submitHelper,
    onSubmitted,
    onEditSection,
    sectionRef,
}: StepReviewProps) {
    const [error, setError] = useState('');
    const [pending, startTransition] = useTransition();
    const [showSubmit, setShowSubmit] = useState(false);
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [peekVisible, setPeekVisible] = useState(true);
    const paperRef = useRef<HTMLDivElement>(null);
    const mobilePaperRef = useRef<HTMLDivElement>(null);
    const sectionElRef = useRef<HTMLElement | null>(null);
    const [sectionNode, setSectionNode] = useState<HTMLElement | null>(null);

    const ready = canSubmitRequest(draft, lines);
    const toName =
        `${draft.contactFirstName} ${draft.contactLastName}`.trim() || '—';
    const shippingLines = formatAddressLines(draft.shippingAddress);
    const officeLines = formatAddressLines(draft.companyAddress);
    const spendDisplay = formatSpendLabel(draft.annualSpend);
    const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const displayRef =
        draft.ref && /^RFQ-\d{5}$/.test(draft.ref)
            ? draft.ref
            : REQUEST_COPY.refPlaceholder;
    const briefText = draft.notes.trim();

    const summaryProps: SummaryBodyProps = {
        draft,
        lines,
        toName,
        shippingLines,
        officeLines,
        spendDisplay,
        briefText,
        onEditSection: (key) => {
            setSummaryOpen(false);
            onEditSection(key);
        },
    };

    useEffect(() => {
        let raf = 0;
        const scrubPaper = (el: HTMLElement | null) => {
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const vh = window.innerHeight;
            if (rect.height <= 0) return;
            const entered = vh - rect.top;
            const fadeStart = vh * 0.15;
            const fadeDistance = Math.min(rect.height / 3, vh * 0.35);
            const linear = Math.min(
                1,
                Math.max(0, (entered - fadeStart) / fadeDistance),
            );
            // Ease-out cubic — soft settle into full opacity / rest position.
            const progress = 1 - Math.pow(1 - linear, 3);
            el.style.opacity = String(progress);
            el.style.transform = `translate3d(0, ${(1 - progress) * 48}px, 0)`;
        };
        const compute = () => {
            raf = 0;
            scrubPaper(mobilePaperRef.current);
            const paper = paperRef.current;
            let reveal = false;
            if (paper) {
                scrubPaper(paper);
                const rect = paper.getBoundingClientRect();
                const vh = window.innerHeight;
                if (rect.height > 0) {
                    const visible = Math.max(
                        0,
                        Math.min(rect.bottom, vh) - Math.max(rect.top, 0),
                    );
                    reveal = visible / rect.height >= 0.5;
                }
            }
            setShowSubmit((prev) => (prev === reveal ? prev : reveal));
        };
        const onScroll = () => {
            if (!raf) raf = requestAnimationFrame(compute);
        };
        compute();
        window.addEventListener('scroll', onScroll, {passive: true});
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []);

    useEffect(() => {
        const el = sectionNode;
        if (!el) return;

        const syncPeek = () => {
            const rect = el.getBoundingClientRect();
            const vh = window.innerHeight;
            // Hide peek while Review overlaps the viewport; show on earlier steps.
            const inReview = rect.top < vh && rect.bottom > 0;
            setPeekVisible(!inReview);
            if (inReview) {
                setSummaryOpen(false);
            }
        };

        let raf = 0;
        const onScroll = () => {
            if (!raf)
                raf = requestAnimationFrame(() => {
                    raf = 0;
                    syncPeek();
                });
        };

        syncPeek();
        window.addEventListener('scroll', onScroll, {passive: true});
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [sectionNode]);

    function handleSubmit() {
        setError('');
        startTransition(async () => {
            const result = await submitRequest({draft, lines});
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setSummaryOpen(false);
            onSubmitted(result.ref);
        });
    }

    const helperCapitalized = submitHelper
        ? submitHelper.charAt(0).toUpperCase() + submitHelper.slice(1)
        : '';
    const statusLine = !ready
        ? helperCapitalized || productsStatusLabel(lines.length)
        : productsStatusLabel(lines.length);

    return (
        <section
            id="section-review"
            data-section="review"
            ref={(node) => {
                sectionElRef.current = node;
                setSectionNode((prev) => (prev === node ? prev : node));
                if (typeof sectionRef === 'function') {
                    sectionRef(node);
                } else if (sectionRef) {
                    sectionRef.current = node;
                }
            }}
            className="w-full bg-[#f2f2f2] px-6 pb-8 pt-16 sm:px-10 lg:-ml-10 lg:w-[calc(100%+2.5rem)] lg:pb-24 lg:pt-40 lg:pl-20"
        >
            <div className="mx-auto w-full max-w-[820px]">
                <div className="mb-8 text-center text-foreground">
                    <h2 className="text-[26px] font-semibold tracking-tight">
                        {REQUEST_COPY.reviewTitle}
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                        {REQUEST_COPY.reviewSubtitle}
                    </p>
                </div>

                {/* Mobile letter paper */}
                <div
                    ref={mobilePaperRef}
                    className="relative z-0 mx-auto w-full rounded-md bg-white text-foreground shadow-2xl ring-1 ring-black/5 will-change-[opacity,transform] lg:hidden"
                    style={{
                        opacity: 0,
                        transform: 'translate3d(0, 48px, 0)',
                    }}
                >
                    <div className="flex flex-col px-4 py-6">
                        <ReviewLetterhead
                            displayRef={displayRef}
                            today={today}
                        />
                        <ReviewSummaryBody {...summaryProps} />
                    </div>
                </div>

                {/* Mobile in-flow submit */}
                <div className="mt-6 lg:hidden">
                    <Button
                        type="button"
                        disabled={!ready || pending}
                        className="flex h-auto min-h-[52px] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md bg-foreground py-4 text-[15px] font-semibold leading-tight text-background shadow-none transition-opacity hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-30"
                        onClick={handleSubmit}
                    >
                        {pending
                            ? REQUEST_COPY.submitting
                            : REQUEST_COPY.requestAQuote}
                    </Button>
                    <p className="mt-2 text-center text-[11px] leading-snug text-muted-foreground">
                        {REQUEST_COPY.submitFootnote}
                    </p>
                    {error ? (
                        <p className="mt-2 text-center text-xs text-destructive">
                            {error}
                        </p>
                    ) : null}
                </div>

                {/* Desktop letter paper */}
                <div
                    ref={paperRef}
                    className="relative z-0 mx-auto hidden aspect-[8.5/11] w-full rounded-md bg-white text-foreground shadow-2xl ring-1 ring-black/5 will-change-[opacity,transform] lg:block"
                    style={{
                        opacity: 0,
                        transform: 'translate3d(0, 48px, 0)',
                    }}
                >
                    <div className="flex h-full flex-col px-10 py-12 sm:px-14">
                        <ReviewLetterhead
                            displayRef={displayRef}
                            today={today}
                        />
                        <ReviewSummaryBody {...summaryProps} />
                    </div>
                </div>

                {/* Desktop sticky CTA */}
                <div
                    className={cn(
                        'sticky bottom-6 z-30 mx-auto mt-8 hidden w-full max-w-[820px] transition-all duration-300 lg:block',
                        showSubmit
                            ? 'translate-y-0 opacity-100'
                            : 'pointer-events-none translate-y-3 opacity-0',
                    )}
                >
                    <Button
                        type="button"
                        disabled={!ready || pending}
                        className="mx-auto flex h-auto min-h-[52px] w-1/2 cursor-pointer flex-col items-center justify-center gap-1 rounded-md bg-foreground py-4 text-[15px] font-semibold leading-tight text-background shadow-none transition-opacity hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-30"
                        onClick={handleSubmit}
                    >
                        {pending
                            ? REQUEST_COPY.submitting
                            : REQUEST_COPY.requestAQuote}
                    </Button>
                    <p className="mx-auto mt-2 w-1/2 text-center text-[11px] leading-snug text-muted-foreground">
                        {REQUEST_COPY.submitFootnote}
                    </p>
                    {error ? (
                        <p className="mx-auto mt-2 w-1/2 text-center text-xs text-destructive">
                            {error}
                        </p>
                    ) : null}
                </div>
            </div>

            {/* Mobile peek bar — visible before Review; hidden once Review is in view */}
            <div
                className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] transition-[transform,opacity] duration-300 lg:hidden"
                style={{
                    transform:
                        peekVisible || summaryOpen
                            ? 'translateY(0)'
                            : 'translateY(100%)',
                    opacity: peekVisible || summaryOpen ? 1 : 0,
                    pointerEvents:
                        peekVisible || summaryOpen ? 'auto' : 'none',
                }}
                aria-hidden={!peekVisible && !summaryOpen}
            >
                <div className="mx-auto flex w-full max-w-[820px] items-center gap-3 px-4">
                    <button
                        type="button"
                        onClick={() => setSummaryOpen(true)}
                        aria-expanded={summaryOpen}
                        className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
                    >
                        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            {REQUEST_COPY.requestSummary}
                            <ChevronUp
                                className="size-4 shrink-0 text-muted-foreground"
                                aria-hidden
                            />
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                            {statusLine}
                        </span>
                    </button>
                    <Button
                        type="button"
                        disabled={!ready || pending}
                        className="h-9 shrink-0 cursor-pointer rounded-md bg-foreground px-3 text-sm font-semibold text-background shadow-none transition-opacity hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-30"
                        onClick={handleSubmit}
                    >
                        {pending
                            ? REQUEST_COPY.submitting
                            : REQUEST_COPY.requestAQuote}
                    </Button>
                </div>
                {error ? (
                    <p className="mx-auto mt-1 max-w-[820px] px-4 text-xs text-destructive">
                        {error}
                    </p>
                ) : null}
            </div>

            {/* Mobile summary sheet */}
            <Sheet open={summaryOpen} onOpenChange={setSummaryOpen}>
                <SheetContent
                    side="bottom"
                    className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-t-xl p-0 lg:hidden"
                >
                    <SheetHeader className="shrink-0 border-b border-border px-4 py-4 text-left">
                        <SheetTitle>{REQUEST_COPY.requestSummary}</SheetTitle>
                    </SheetHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                        <div className="mb-4 flex items-start justify-between gap-4 border-b border-dashed border-[#E9E9E7] pb-4">
                            <div className="leading-tight">
                                <p className="text-[15px] font-semibold tracking-tight">
                                    {REQUEST_COPY.letterheadName}
                                </p>
                                <p className="text-[12.5px] text-muted-foreground">
                                    {REQUEST_COPY.letterheadTagline}
                                </p>
                            </div>
                            <div className="text-right leading-tight">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
                                    {REQUEST_COPY.reviewPaperBadge}
                                </p>
                                <p className="mt-1 text-[12.5px] text-muted-foreground">
                                    {today}
                                </p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground/70">
                                    {REQUEST_COPY.refLabel} {displayRef}
                                </p>
                            </div>
                        </div>
                        <ReviewSummaryBody {...summaryProps} compact />
                    </div>
                </SheetContent>
            </Sheet>
        </section>
    );
}
