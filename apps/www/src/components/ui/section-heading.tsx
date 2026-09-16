import type {ReactNode} from 'react';

import {cn} from '@pakfactory/ui/lib/utils';

/** Bracketed V5 kicker, e.g. `[ Specifications ]`. */
export function formatSectionEyebrow(text: string): string {
    const value = text.trim();
    if (!value) return value;
    if (value.startsWith('[') && value.endsWith(']')) return value;
    return `[ ${value} ]`;
}

type SectionHeadingProps = {
    eyebrow?: string;
    title: ReactNode;
    description?: ReactNode;
    align?: 'left' | 'center';
    eyebrowTone?: 'blue' | 'muted';
    titleClassName?: string;
    descriptionClassName?: string;
    className?: string;
    /** Optional right-side slot (e.g. carousel controls). */
    actions?: ReactNode;
};

/**
 * Shared section header — V5 eyebrow / title / description rhythm.
 * Props-only; reuse across product + sections (ADR-013).
 */
export function SectionHeading({
    eyebrow,
    title,
    description,
    align = 'left',
    eyebrowTone = 'blue',
    titleClassName,
    descriptionClassName,
    className,
    actions,
}: SectionHeadingProps) {
    const heading = (
        <div
            className={cn(
                'flex flex-col gap-6',
                align === 'center' && 'items-center text-center',
            )}
        >
            {eyebrow ? (
                <p
                    className={cn(
                        'text-[11px] font-semibold uppercase tracking-[0.08em]',
                        eyebrowTone === 'muted'
                            ? 'text-muted-foreground'
                            : 'text-brand-blue',
                    )}
                >
                    {formatSectionEyebrow(eyebrow)}
                </p>
            ) : null}
            <h2
                className={cn(
                    'text-[32px] font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-[42px] sm:leading-[1.12]',
                    titleClassName,
                )}
            >
                {title}
            </h2>
            {description ? (
                <p
                    className={cn(
                        'max-w-140 text-sm leading-6 text-muted-foreground',
                        align === 'center' && 'mx-auto',
                        descriptionClassName,
                    )}
                >
                    {description}
                </p>
            ) : null}
        </div>
    );

    if (!actions) {
        return <div className={className}>{heading}</div>;
    }

    return (
        <div
            className={cn(
                'flex flex-wrap items-end justify-between gap-4',
                className,
            )}
        >
            {heading}
            <div className="flex shrink-0 gap-2">{actions}</div>
        </div>
    );
}
