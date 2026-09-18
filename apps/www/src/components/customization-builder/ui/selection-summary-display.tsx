'use client';

import type {CSSProperties} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';
import {
    summarizeAnswer,
    visiblePropertySummaries,
    type PropertySelectionSummaryItem,
    type StepAnswer,
} from '@/lib/customization-builder';

type SelectionSummaryDisplayProps = {
    answer: StepAnswer;
    specialistLabel: string;
    propertySummaries?: PropertySelectionSummaryItem[];
    className?: string;
};

/**
 * Option title + mini swatch circles / chip text for rail & overview.
 * Consultation items are omitted from the front (still in payload).
 */
export function SelectionSummaryDisplay({
    answer,
    specialistLabel,
    propertySummaries,
    className,
}: SelectionSummaryDisplayProps) {
    if (answer.status === 'unset') {
        return (
            <span className={className}>{summarizeAnswer(answer, specialistLabel)}</span>
        );
    }
    if (answer.status === 'not-sure' || 'dimensions' in answer) {
        return (
            <span className={cn('truncate', className)}>
                {summarizeAnswer(answer, specialistLabel)}
            </span>
        );
    }

    const visible = visiblePropertySummaries(propertySummaries);
    const swatches = visible.filter((item) => item.kind === 'swatch');
    const chips = visible.filter((item) => item.kind === 'chip');
    const text = [
        answer.selection.label,
        ...chips.map((item) => item.label),
    ].join(' · ');

    return (
        <span
            className={cn(
                'inline-flex min-w-0 max-w-full items-center gap-2',
                className,
            )}
        >
            <span className="min-w-0 truncate">{text}</span>
            {swatches.length > 0 ? (
                <span className="flex shrink-0 items-center gap-1">
                    {swatches.map((item, index) => (
                        <MiniSwatch
                            key={`${item.label}-${index}`}
                            label={item.label}
                            color={item.color}
                            imageUrl={item.imageUrl}
                        />
                    ))}
                </span>
            ) : null}
        </span>
    );
}

function MiniSwatch({
    label,
    color,
    imageUrl,
}: {
    label: string;
    color?: string;
    imageUrl?: string;
}) {
    const style: CSSProperties = imageUrl
        ? {backgroundImage: `url(${imageUrl})`}
        : {backgroundColor: color ?? 'var(--muted)'};

    return (
        <span
            title={label}
            aria-label={label}
            className="size-3 shrink-0 rounded-full border border-border bg-cover bg-center"
            style={style}
        />
    );
}
