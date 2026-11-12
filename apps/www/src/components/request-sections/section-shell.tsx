'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';
import {Check} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

export type SectionState = 'open' | 'done' | 'todo';

/** Fold / unfold duration for section bodies — scroll settle waits for this. */
export const SECTION_FOLD_MS = 300;
const DURATION = SECTION_FOLD_MS;

/**
 * One section of the sectioned request page. Open: the fields and
 * Continue. Done: a summary under the title; the row opens the step. To do: just the title. PORTABLE.
 */
export function SectionShell({
    id,
    index,
    title,
    state,
    summary,
    meta,
    progress,
    onEdit,
    cta,
    /**
     * Submit strip: no step number/title; body always mounted (opt-in + button).
     * Enablement lives on the Submit button.
     */
    hideHeading = false,
    children,
}: {
    id: string;
    index: number;
    title: string;
    state: SectionState;
    summary?: ReactNode;
    /** Shown on the right of an open section's heading, e.g. "2 of 3 selected". */
    meta?: ReactNode;
    /** Under an open section's heading, e.g. "Step 1 of 3 · Next: Project details". */
    progress?: ReactNode;
    onEdit: () => void;
    /**
     * Owner Nov 6: the next step's row carries Continue (dark once the open step is complete),
     * so the next step reads as "ready for you". Only the step right after the open one has it.
     */
    cta?: {onClick: () => void; disabled: boolean; label?: string; reason?: string | null};
    hideHeading?: boolean;
    children: ReactNode;
}) {
    // Delay done summary until the body has folded — live summaries (esp. Items) are tall;
    // showing them immediately shoves the next header down and fights the follow-scroll.
    const [showSummary, setShowSummary] = useState(state === 'done');
    const prevState = useRef(state);
    useEffect(() => {
        const prev = prevState.current;
        prevState.current = state;
        if (state === 'done') {
            if (prev === 'open') {
                setShowSummary(false);
                const t = setTimeout(() => setShowSummary(true), DURATION);
                return () => clearTimeout(t);
            }
            setShowSummary(true);
            return;
        }
        setShowSummary(false);
    }, [state]);

    const mutedTodo = state === 'todo' && !(cta && !cta.disabled);

    return (
        <section
            id={`section-${id}`}
            data-state={state}
            // Owner Nov 6: no box — the section spans the page container; a dashed rule separates sections.
            className="border-t border-dashed border-border first:border-t-0"
        >
            {/* Owner Nov 6: the divider spans the page; the content sits in a centred 1024px (max-w-5xl) column. */}
            <div className="mx-auto w-full max-w-5xl px-layout-gutter-inner">
                {hideHeading ? null : (
                    <header
                        id={`section-${id}-header`}
                        // scroll-mt matches dock band (68 chrome + 8 gap) for native scroll/focus.
                        className="flex scroll-mt-[76px] items-start gap-4 pb-10 pt-12"
                    >
                        <div className="min-w-0 flex-1">
                            <h2
                                className={cn(
                                    'flex items-center gap-4 text-2xl font-medium tracking-tight sm:text-3xl',
                                    mutedTodo ? 'text-muted-foreground' : 'text-foreground',
                                )}
                            >
                                <StepMark done={state === 'done'} open={state === 'open'} index={index} />
                                <span>{title}</span>
                            </h2>
                            {state === 'open' && progress ? (
                                <p className="mt-2 text-sm text-muted-foreground">{progress}</p>
                            ) : null}
                        </div>
                        {state === 'open' && meta ? (
                            <div className="mt-2 shrink-0 text-sm text-muted-foreground">{meta}</div>
                        ) : null}
                        {state === 'done' ? (
                            <button
                                type="button"
                                onClick={onEdit}
                                className="mt-2 shrink-0 text-base font-medium text-foreground underline underline-offset-4"
                            >
                                Edit
                            </button>
                        ) : null}
                        {state === 'todo' && cta ? <ContinueCta cta={cta} /> : null}
                    </header>
                )}
                {showSummary && summary ? (
                    <div className="pb-10 pl-0 text-sm text-muted-foreground sm:pl-14">{summary}</div>
                ) : null}
                <SectionBody open={hideHeading || state === 'open'} flush={hideHeading} skipFocus={hideHeading}>
                    {children}
                </SectionBody>
            </div>
        </section>
    );
}

/**
 * Continue on the next step's row. Blocked reason stays hidden until the buyer clicks the
 * disabled button (or the open step becomes ready and the reason clears).
 */
function ContinueCta({
    cta,
}: {
    cta: {onClick: () => void; disabled: boolean; label?: string; reason?: string | null};
}) {
    const [showReason, setShowReason] = useState(false);
    useEffect(() => {
        if (!cta.disabled || !cta.reason) setShowReason(false);
    }, [cta.disabled, cta.reason]);

    return (
        <div className="flex shrink-0 items-center gap-4">
            {showReason && cta.disabled && cta.reason ? (
                <p className="max-w-56 text-right text-sm text-muted-foreground" aria-live="polite">
                    {cta.reason}
                </p>
            ) : null}
            <span
                className={cta.disabled ? 'inline-flex cursor-not-allowed' : 'inline-flex'}
                // Disabled buttons swallow clicks — catch them on the wrapper to reveal why.
                onClick={cta.disabled ? () => setShowReason(true) : undefined}
            >
                <Button
                    type="button"
                    size="lg"
                    disabled={cta.disabled}
                    className={cta.disabled ? 'pointer-events-none' : undefined}
                    onClick={cta.onClick}
                >
                    {cta.label ?? 'Continue'}
                </Button>
            </span>
        </div>
    );
}

/** The step number, or a check once the step is done. Sits beside the title, not above the summary. */
function StepMark({done, open, index}: {done: boolean; open: boolean; index: number}) {
    return (
        <span
            className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-md text-base font-medium tabular-nums sm:text-lg',
                done
                    ? 'bg-foreground text-background'
                    : cn('bg-muted', open ? 'text-foreground' : 'text-muted-foreground'),
            )}
            aria-hidden
        >
            {done ? <Check className="size-5" /> : index}
        </span>
    );
}

/**
 * Owner Nov 6: the open step unfolds and the previous one folds (≈300ms, ease-out); the content
 * stays mounted while it folds so the collapse is visible. Keyboard focus moves to the new step's
 * first field. "Reduce motion" gets an instant switch. PORTABLE.
 */
function SectionBody({
    open,
    flush = false,
    skipFocus = false,
    children,
}: {
    open: boolean;
    /** No step-mark column indent (headerless Submit strip). */
    flush?: boolean;
    /** Submit strip stays mounted from the start — do not steal focus into it. */
    skipFocus?: boolean;
    children: ReactNode;
}) {
    const [mounted, setMounted] = useState(open);
    const [expanded, setExpanded] = useState(open);
    // Content settle on expand only (entry uses SectionReveal) — height tween alone feels like a hard cut.
    const [settle, setSettle] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        let t: ReturnType<typeof setTimeout> | undefined;
        let raf = 0;
        if (open) {
            setMounted(true);
            setSettle(false);
            // Next frame: start from 0 height, then grow; settle content as it opens.
            raf = requestAnimationFrame(() => {
                raf = requestAnimationFrame(() => {
                    setExpanded(true);
                    setSettle(true);
                });
            });
            if (!skipFocus) {
                t = setTimeout(() => {
                    ref.current
                        ?.querySelector<HTMLElement>(
                            'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
                        )
                        ?.focus({preventScroll: true});
                }, DURATION + 20);
            }
        } else {
            setExpanded(false);
            setSettle(false);
            t = setTimeout(() => setMounted(false), DURATION);
        }
        return () => {
            if (t) clearTimeout(t);
            cancelAnimationFrame(raf);
        };
    }, [open, skipFocus]);
    if (!mounted) return null;
    return (
        <div
            className={cn(
                'grid transition-[grid-template-rows,opacity] ease-out motion-reduce:transition-none',
                expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
            style={{transitionDuration: `${DURATION}ms`}}
            aria-hidden={!open}
            inert={!open}
        >
            {/*
              Fold needs overflow-hidden. When open, overflow-visible so sticky thumbs in item cards work.
            */}
            <div ref={ref} className={cn('relative min-h-0', open ? 'overflow-visible' : 'overflow-hidden')}>
                <div
                    className={cn(
                        'flex flex-col gap-8 pb-10 pl-0 sm:pl-14',
                        // Headerless Submit strip: same title indent as other sections; extra top space for the dashed rule.
                        flush && 'pt-12',
                        settle && 'animate-section-fade-in motion-reduce:animate-none',
                    )}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
