import Link from 'next/link';
import {ArrowLeft, ArrowRight, ChevronRight} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';

export type StagePathStepProps = {
    id: string;
    title: string;
    /** Absent → not a link (current stage, or not released yet). */
    href?: string;
    current: boolean;
    comingSoon: boolean;
};

type StagePathLink = {label: string; href: string};

type StagePathProps = {
    steps: StagePathStepProps[];
    previous?: StagePathLink;
    next?: StagePathLink;
    /** Accessible name for the step list. */
    label: string;
    className?: string;
};

/**
 * Linear stage path — numbered steps with the current one highlighted, plus
 * previous / next links (POC `LifecycleModule`). Cells sit on a 1px border
 * seam with a chevron in each seam, so it reads as a path rather than a table.
 * Props-only (ADR-013); used by the expertise lifecycle band ("Where this
 * fits"). Stacks vertically below `md`, where the chevrons drop out.
 */
export function StagePath({
    steps,
    previous,
    next,
    label,
    className,
}: StagePathProps) {
    if (steps.length === 0) return null;

    return (
        <nav aria-label={label} className={cn('flex flex-col gap-6', className)}>
            <ol className="flex flex-col gap-px overflow-hidden rounded-xl border border-border bg-border md:flex-row">
                {steps.map((step, index) => {
                    const inner = (
                        <>
                            <span
                                className={cn(
                                    'font-mono text-[11px]',
                                    step.current
                                        ? 'text-background/60'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="text-base font-medium">
                                {step.title}
                            </span>
                            {step.comingSoon ? (
                                <span className="text-xs text-muted-foreground">
                                    Coming soon
                                </span>
                            ) : null}
                        </>
                    );
                    const cellClass = cn(
                        'flex h-full flex-col gap-2 p-6',
                        step.current ? 'bg-foreground text-background' : 'bg-background',
                        !step.current && !step.href && 'text-muted-foreground',
                    );
                    return (
                        <li
                            key={step.id}
                            className="relative min-w-0 flex-1"
                            aria-current={step.current ? 'step' : undefined}
                        >
                            {index > 0 ? (
                                <Icon
                                    icon={ChevronRight}
                                    className="absolute -left-2.5 top-1/2 z-10 hidden size-5 -translate-y-1/2 text-muted-foreground md:block"
                                />
                            ) : null}
                            {step.href ? (
                                <Link
                                    href={step.href}
                                    className={cn(
                                        cellClass,
                                        'text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                                    )}
                                >
                                    {inner}
                                </Link>
                            ) : (
                                <div className={cellClass}>{inner}</div>
                            )}
                        </li>
                    );
                })}
            </ol>
            {previous || next ? (
                <div className="flex flex-wrap items-center justify-between gap-4 text-base">
                    {previous ? (
                        <Link
                            href={previous.href}
                            className="group inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <Icon
                                icon={ArrowLeft}
                                className="transition-transform duration-300 group-hover:-translate-x-1 motion-reduce:transition-none"
                            />
                            {previous.label}
                        </Link>
                    ) : (
                        <span />
                    )}
                    {next ? (
                        <Link
                            href={next.href}
                            className="group inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                        >
                            {next.label}
                            <Icon
                                icon={ArrowRight}
                                className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
                            />
                        </Link>
                    ) : null}
                </div>
            ) : null}
        </nav>
    );
}
