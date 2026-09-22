import type {ReactNode} from 'react';
import Link from 'next/link';
import {ChevronRight} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';

/** Bracketed V5 kicker, e.g. `[ Specifications ]`. */
export function formatSectionEyebrow(text: string): string {
    const value = text.trim();
    if (!value) return value;
    if (value.startsWith('[') && value.endsWith(']')) return value;
    return `[ ${value} ]`;
}

export type SectionHeadingCta = {
    label: string;
    href: string;
};

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
    /** Built-in explore link — rendered when `showCta` is true. */
    cta?: SectionHeadingCta;
    /** When false, CTA is omitted even if `cta` is set. Default true. */
    showCta?: boolean;
    /**
     * `bottom` = under description in the column (default).
     * `end` = right-aligned beside the heading column.
     */
    ctaPlacement?: 'bottom' | 'end';
};

function SectionHeadingCtaLink({cta}: {cta: SectionHeadingCta}) {
    return (
        <Link
            href={cta.href}
            className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-foreground"
        >
            <span className="underline-offset-4 group-hover:underline">
                {cta.label}
            </span>
            <Icon
                icon={ChevronRight}
                size="sm"
                className="transition-transform duration-300 ease-out group-hover:translate-x-0.5"
            />
        </Link>
    );
}

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
    cta,
    showCta = true,
    ctaPlacement = 'bottom',
}: SectionHeadingProps) {
    const ctaNode =
        showCta && cta && cta.label.trim() ? (
            <SectionHeadingCtaLink cta={cta} />
        ) : null;
    const bottomCta = ctaNode && ctaPlacement === 'bottom' ? ctaNode : null;
    const endCta = ctaNode && ctaPlacement === 'end' ? ctaNode : null;
    const endCluster =
        endCta || actions ? (
            <div className="flex shrink-0 gap-2">
                {endCta}
                {actions}
            </div>
        ) : null;

    const heading = (
        <div
            className={cn(
                'flex min-w-0 flex-1 flex-col gap-6',
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
            {bottomCta}
        </div>
    );

    if (!endCluster) {
        return <div className={className}>{heading}</div>;
    }

    return (
        <div
            className={cn(
                'flex w-full flex-wrap items-end justify-between gap-4',
                className,
            )}
        >
            {heading}
            {endCluster}
        </div>
    );
}
