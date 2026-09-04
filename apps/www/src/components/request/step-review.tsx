'use client';

import {useEffect, useRef, useState, useTransition} from 'react';
import {ChevronUp} from 'lucide-react';
import {
    RequestReviewPaper,
    RequestReviewSheetHeader,
} from '@pakfactory/brief-builder-ui/request-review-paper';
import {Button} from '@pakfactory/ui/components/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@pakfactory/ui/components/sheet';
import {cn} from '@pakfactory/ui/lib/utils';
import {LogoMark} from '@/components/layout/logo-mark';
import {REQUEST_COPY} from '@/lib/copy/request';
import {getRequestReviewCopy} from '@/lib/request/request-review-copy';
import type {RequestDraft, RequestLine} from '@/lib/request/request.storage';
import {canSubmitRequest} from '@/lib/request/validation';
import {MessageDialog} from '@/components/ui/message-dialog';
import {logSubmitPayload} from '@/lib/rfq/log-submit-payload';
import {submitRequest} from '@/lib/rfq/submit-request';

type StepReviewProps = {
    draft: RequestDraft;
    lines: RequestLine[];
    submitHelper: string;
    onSubmitted: (ref: string) => void;
    onEditSection: (key: string) => void;
    sectionRef?: React.Ref<HTMLElement>;
};

function productsStatusLabel(count: number): string {
    if (count === 0) return REQUEST_COPY.noProductsCount;
    if (count === 1) return REQUEST_COPY.productsCountOne;
    return REQUEST_COPY.productsCountMany.replace('{n}', String(count));
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

    const reviewCopy = getRequestReviewCopy();
    const ready = canSubmitRequest(draft, lines);
    const documentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const displayRef =
        draft.ref && /^RFQ-\d{5}$/.test(draft.ref)
            ? draft.ref
            : REQUEST_COPY.refPlaceholder;

    const paperProps = {
        draft,
        lines,
        displayRef,
        documentDate,
        copy: reviewCopy,
        logoSlot: <LogoMark className="size-9 shrink-0" />,
        mode: 'interactive' as const,
        productTitle: (slug: string) => {
            const fromLine = lines.find((line) => line.productSlug === slug);
            return fromLine?.productTitle ?? slug;
        },
        onEditSection: (key: string) => {
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
        logSubmitPayload(draft, lines);
        startTransition(async () => {
            try {
                const result = await submitRequest({draft, lines});
                if (!result.ok) {
                    setError(result.error);
                    return;
                }
                setSummaryOpen(false);
                onSubmitted(result.ref);
            } catch {
                setError(REQUEST_COPY.submitTransportError);
            }
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

                <RequestReviewPaper
                    {...paperProps}
                    paperRef={mobilePaperRef}
                    className="relative z-0 mx-auto w-full will-change-[opacity,transform] lg:hidden"
                    style={{
                        opacity: 0,
                        transform: 'translate3d(0, 48px, 0)',
                    }}
                />

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
                </div>

                <RequestReviewPaper
                    {...paperProps}
                    paperRef={paperRef}
                    className="relative z-0 mx-auto hidden aspect-[8.5/11] w-full will-change-[opacity,transform] lg:block"
                    style={{
                        opacity: 0,
                        transform: 'translate3d(0, 48px, 0)',
                    }}
                />

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
                </div>
            </div>

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
            </div>

            <Sheet open={summaryOpen} onOpenChange={setSummaryOpen}>
                <SheetContent
                    side="bottom"
                    className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-t-xl p-0 lg:hidden"
                >
                    <SheetHeader className="shrink-0 border-b border-border px-4 py-4 text-left">
                        <SheetTitle>{REQUEST_COPY.requestSummary}</SheetTitle>
                    </SheetHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                        <RequestReviewSheetHeader
                            copy={reviewCopy}
                            displayRef={displayRef}
                            documentDate={documentDate}
                        />
                        <RequestReviewPaper
                            {...paperProps}
                            compact
                        />
                    </div>
                </SheetContent>
            </Sheet>

            <MessageDialog
                open={Boolean(error)}
                title={REQUEST_COPY.submitErrorTitle}
                description={error}
                actionLabel={REQUEST_COPY.submitErrorRetry}
                onAction={handleSubmit}
                secondaryLabel={REQUEST_COPY.submitErrorClose}
                onSecondary={() => setError('')}
                onDismiss={() => setError('')}
                pending={pending}
            />
        </section>
    );
}
