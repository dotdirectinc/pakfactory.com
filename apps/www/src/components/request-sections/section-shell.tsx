'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';
import {Check} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

export type SectionState = 'open' | 'done' | 'todo';

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
    footer,
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
    /** Under the open body (e.g. Submit); flush with the step mark on mobile, title-aligned from sm. */
    footer?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section
            id={`section-${id}`}
            data-state={state}
            // Owner Nov 6: no box — the section spans the page container; a dashed rule separates sections.
            className="border-t border-dashed border-border first:border-t-0"
        >
            {/* Owner Nov 6: the divider spans the page; the content sits in a centred 1024px (max-w-5xl) column. */}
            <div className="mx-auto w-full max-w-5xl px-layout-gutter-inner">
                {state === 'done' ? (
                    <button
                        type="button"
                        onClick={onEdit}
                        className="flex w-full flex-col gap-4 pb-10 pt-12 text-left"
                    >
                        <span className="flex items-center gap-4">
                            <StepMark done open={false} index={index} />
                            <h2 className="min-w-0 flex-1 text-2xl font-medium tracking-tight text-foreground sm:text-3xl">{title}</h2>
                            <span className="shrink-0 text-base font-medium text-foreground underline underline-offset-4">Edit</span>
                        </span>
                        {summary ? <div className="pl-0 text-sm text-muted-foreground sm:pl-14">{summary}</div> : null}
                    </button>
                ) : (
                /* Owner Nov 6: more room above and below every step heading, so it reads as a step (not a label). */
                <header className="flex items-start gap-4 pb-10 pt-12">
                    <div className="min-w-0 flex-1">
                        {/* Owner Nov 6: plain number + title as one h2, no circle; a check replaces the number when done. */}
                        <h2
                            className={cn(
                                'flex items-center gap-4 text-2xl font-medium tracking-tight sm:text-3xl',
                                state === 'todo' && !(cta && !cta.disabled) ? 'text-muted-foreground' : 'text-foreground',
                            )}
                        >
                            <StepMark done={false} open={state === 'open'} index={index} />
                            <span>{title}</span>
                        </h2>
                        {state === 'open' && progress ? <p className="mt-2 text-sm text-muted-foreground">{progress}</p> : null}
                    </div>
                    {state === 'open' && meta ? <div className="mt-2 shrink-0 text-sm text-muted-foreground">{meta}</div> : null}
                    {state === 'todo' && cta ? (
                        <div className="flex shrink-0 items-center gap-4">
                            {/* Owner Nov 6: say why Continue is off (the first thing missing in the open step). */}
                            {cta.disabled && cta.reason ? (
                                <p className="max-w-56 text-right text-sm text-muted-foreground" aria-live="polite">
                                    {cta.reason}
                                </p>
                            ) : null}
                            <Button type="button" size="lg" disabled={cta.disabled} onClick={cta.onClick}>
                                {cta.label ?? 'Continue'}
                            </Button>
                        </div>
                    ) : null}
                </header>
                )}
                <SectionBody open={state === 'open'}>{children}</SectionBody>
                {state === 'open' && footer ? (
                    <div className="mt-8 border-t border-border pt-10 pb-10 sm:ml-14">{footer}</div>
                ) : null}
            </div>
        </section>
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

const DURATION = 300;

/**
 * Owner Nov 6: the open step unfolds and the previous one folds (≈300ms, ease-out); the content
 * stays mounted while it folds so the collapse is visible. Keyboard focus moves to the new step's
 * first field. "Reduce motion" gets an instant switch. PORTABLE.
 */
function SectionBody({open, children}: {open: boolean; children: ReactNode}) {
    const [mounted, setMounted] = useState(open);
    const [expanded, setExpanded] = useState(open);
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
            // Next frame: start from 0 height, then grow.
            raf = requestAnimationFrame(() => {
                raf = requestAnimationFrame(() => setExpanded(true));
            });
            t = setTimeout(() => {
                ref.current
                    ?.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])')
                    ?.focus({preventScroll: true});
            }, DURATION + 20);
        } else {
            setExpanded(false);
            t = setTimeout(() => setMounted(false), DURATION);
        }
        return () => {
            if (t) clearTimeout(t);
            cancelAnimationFrame(raf);
        };
    }, [open]);
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
                <div className="flex flex-col gap-8 pb-10 pl-0 sm:pl-14">{children}</div>
            </div>
        </div>
    );
}
